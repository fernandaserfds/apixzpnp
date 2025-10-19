import express from 'express';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';

const app = express();
const PORT = process.env.PORT || 3000;
const RDP_BASE = process.env.RDP_BASE || 'http://tu.rdp.ip:4000';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

app.use(bodyParser.raw({ type: '*/*', limit: '5mb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.all('/*', async (req, res) => {
  try {
    const method = req.method;
    const pathWithQuery = req.originalUrl || req.url;
    const rawBody = req.body && req.body.length ? req.body : undefined;
    const targetUrl = RDP_BASE.replace(/\/$/, '') + pathWithQuery;

    const headers = { ...req.headers };
    delete headers.host;

    const fetchRes = await fetch(targetUrl, {
      method,
      headers,
      body: rawBody
    });

    res.status(fetchRes.status);
    fetchRes.headers.forEach((v, k) => {
      if (!['transfer-encoding','content-encoding','connection'].includes(k.toLowerCase())) {
        res.setHeader(k, v);
      }
    });
    const buffer = await fetchRes.buffer();
    res.send(buffer);
  } catch (err) {
    console.error('Proxy error', err);
    res.status(502).json({ error: 'proxy_error', detail: String(err) });
  }
});

app.listen(PORT, ()=> {
  console.log(`Render proxy listening on ${PORT}, forwarding to ${RDP_BASE}`);
});
