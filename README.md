# Render Proxy (Dynamic target/port)

Permite que el **frontend elija el destino** (host/puerto) por petición.
Soporta tres formas:

1) **Header** `X-Target-Base: http://HOST:PUERTO`
2) **Query** `?target=http%3A%2F%2FHOST%3APUERTO`
3) **Path** `/p/:port/...`  (requiere `RDP_HOST` en env, usa `DEFAULT_SCHEME` si quieres https)

## Variables de entorno
- `ALLOWED_ORIGIN`  (CORS; ej. `https://tu-sitio.netlify.app`)
- `RDP_HOST`        (para el modo `/p/:port/`)
- `DEFAULT_SCHEME`  (`http` por defecto; usa `https` si tu RDP tiene TLS)
- `RDP_BASE`        (base de fallback si no se provee destino en la petición)

## Health
`/health` devuelve info del modo y configuración.

## Ejemplos
- **Header**:
  ```bash
  curl -H "X-Target-Base: http://1.2.3.4:4000" https://tu-proxy.onrender.com/plates
  ```
- **Query**:
  ```bash
  curl "https://tu-proxy.onrender.com/plates?target=http%3A%2F%2F1.2.3.4%3A4000"
  ```
- **Path con puerto** (requiere `RDP_HOST=1.2.3.4` en Render):
  ```bash
  curl https://tu-proxy.onrender.com/p/4000/plates
  ```

> Nota: **127.0.0.1** en Render apunta al propio contenedor de Render, no a tu RDP. Usa la IP/host público de tu RDP.
