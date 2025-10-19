import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;
const RDP_BASE = (process.env.RDP_BASE || 'http://127.0.0.1:4000').replace(/\/$/, '');
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,PUT,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Use express.raw to capture the raw body so we forward bytes exactly
app.use(express.raw({ type: '*/*', limit: '10mb' }));

// Healthcheck
app.get('/health', (_req, res) => res.json({ ok: true, rdp: RDP_BASE }));

// Proxy everything
app.all('/*', async (req, res) => {
  try {
    const method = req.method;
    const pathWithQuery = req.originalUrl || req.url;
    const targetUrl = RDP_BASE + pathWithQuery;

    // Clone headers, drop hop-by-hop
    const headers = { ...req.headers };
    delete headers['host'];
    delete headers['connection'];
    delete headers['content-length']; // let fetch set it

    const body = req.body && req.body.length ? req.body : undefined;

    const upstream = await fetch(targetUrl, { method, headers, body, redirect: 'manual' });

    // Pipe status & headers
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
  console.log(`Render proxy listening on ${PORT}, forwarding to ${RDP_BASE}`);
});
