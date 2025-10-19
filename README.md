# Render Proxy (fixed for Node 18+/22)

- Uses native `fetch` (Node 18+), no `node-fetch` needed.
- Adds `/health` endpoint for Render health checks.
- Uses `express.raw` to forward the exact request body.

## Env
- `RDP_BASE` e.g. `http://123.123.123.123:4000`
- `ALLOWED_ORIGIN` CORS origin (e.g. your Netlify site)

## Run locally
```bash
npm install
RDP_BASE=http://localhost:4000 npm start
```
