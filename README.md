Render proxy (Node + Express)

This proxy forwards all requests it receives to your RDP API (RDP_BASE env var).
It does NOT modify payloads; it simply forwards method, path, headers and body.

Env vars:
- RDP_BASE  (e.g. http://123.123.123.123:4000)
- PORT
- ALLOWED_ORIGIN (for CORS)

Run:
1. npm install
2. RDP_BASE=http://tu.rdp.ip:4000 PORT=3000 node index.js
