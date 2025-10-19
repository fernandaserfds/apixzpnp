import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;
// If only port varies, set RDP_HOST and optional DEFAULT_SCHEME
const RDP_HOST = process.env.RDP_HOST || ''; // e.g. '123.123.123.123' or 'api.mirdp.com'
const DEFAULT_SCHEME = process.env.DEFAULT_SCHEME || 'http';
// Full fallback base if neither header/query/path provide a target
const RDP_BASE_FALLBACK = (process.env.RDP_BASE || '').replace(/\/$/, '');
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,PUT,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Target-Base');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Use express.raw to capture the raw body so we forward the exact payload
app.use(express.raw({ type: '*/*', limit: '20mb' }));

// Health
app.get('/health', (_req, res) => res.json({
  ok: true,
  mode: 'dynamic',
  hint: 'Header X-Target-Base or ?target= or /p/:port/',
  rdpHost: RDP_HOST || null,
  fallback: RDP_BASE_FALLBACK || null
}));

function sanitizeBase(u) {
  if (!u) return '';
  const s = String(u).trim();
  if (!/^https?:\/\//i.test(s)) return '';
  return s.replace(/\/$/, '');
}

function buildBaseFromPort(port) {
  const p = String(port || '').replace(/[^0-9]/g, '');
  if (!p) return '';
  if (!RDP_HOST) return '';
  return `${DEFAULT_SCHEME}://${RDP_HOST}:${p}`;
}

// Determine target base and the path to forward
function resolveTarget(req) {
  const original = req.originalUrl || req.url;

  // 1) Header X-Target-Base (full base URL)
  const hdr = sanitizeBase(req.headers['x-target-base']);
  if (hdr) return { base: hdr, path: original };

  // 2) Query ?target=<full base URL>
  const url = new URL(original, 'http://local'); // base won't be used
  const qTarget = sanitizeBase(url.searchParams.get('target'));
  if (qTarget) return { base: qTarget, path: original };

  // 3) Path style: /p/:port/<rest...>  (requires RDP_HOST env var)
  const m = original.match(/^\/p\/(\d+)(\/.*)?$/);
  if (m) {
    const port = m[1];
    const rest = m[2] || '/';
    const base = buildBaseFromPort(port);
    return { base, path: rest };
  }

  // 4) Fallback env RDP_BASE
  if (RDP_BASE_FALLBACK) return { base: RDP_BASE_FALLBACK, path: original };

  return { base: '', path: original };
}

app.all('/*', async (req, res) => {
  try {
    const { base, path } = resolveTarget(req);
    if (!base) {
      return res.status(502).json({ error: 'no_target', detail: 'No se definió destino. Usa header X-Target-Base, ?target= o /p/:port/ y configura RDP_HOST si usas /p/:port.' });
    }

    const targetUrl = base + path;

    // Clone headers, drop hop-by-hop
    const headers = { ...req.headers };
    delete headers['host'];
    delete headers['connection'];
    delete headers['content-length']; // dejemos que fetch la calcule
    // X-Target-Base no debe ir hacia el upstream
    delete headers['x-target-base'];

    const body = req.body && req.body.length ? req.body : undefined;

    const upstream = await fetch(targetUrl, { method: req.method, headers, body, redirect: 'manual' });

    res.status(upstream.status);
    upstream.headers.forEach((v, k) => {
      const kl = k.toLowerCase();
      if (!['transfer-encoding', 'content-encoding', 'connection'].includes(kl)) {
        res.setHeader(k, v);
      }
    });
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(502).json({ error: 'proxy_error', detail: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Render dynamic proxy on ${PORT}. RDP_HOST=${RDP_HOST || '(not set)'} fallback=${RDP_BASE_FALLBACK || '(none)'}`);
});
