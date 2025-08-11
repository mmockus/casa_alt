# Casatunes Alternate User Interface

A modern, stateless web UI for controlling Casatunes, built with React and Material UI. See `spec.md` for full requirements and design.

## Features
- Room selection and grouping
- See what is playing in each room
- Play, pause, skip, volume control, and all-off
- Album art, artist, song, and volume display

## API Endpoint
- Configure the Casatunes API base via the build arg / env var `REACT_APP_API_BASE`, e.g. `http://<CASATUNES_HOST>:8735/api/v1`.
- Replace `<CASATUNES_HOST>` with your Casatunes server host/IP (see SECURITY.md for placeholder policy). Do not commit real internal hostnames; always use placeholders in public docs.

## Development
- `npm install`
- `npm start`

## Production Build & Docker

### Multi-stage Docker Image (Alpine)
The included Dockerfile builds the React UI and serves it via nginx on a minimal Alpine base.

Build with default API base:

```bash
docker build -t casatunes-ui .
docker run --rm -p 8080:80 casatunes-ui
```

Build with a custom Casatunes API endpoint (baked at build time):

```bash
docker build \
	--build-arg REACT_APP_API_BASE=http://<CASATUNES_HOST>:8735/api/v1 \
	-t casatunes-ui:custom .
docker run --rm -p 8080:80 casatunes-ui:custom
```

Open http://localhost:8080

### docker-compose

```bash
docker compose build
docker compose up -d
```

Adjust the build arg in `docker-compose.yml` if your API endpoint differs.

### Notes
- Create React App inlines env vars at build; changing the API later requires rebuilding.
- Static assets served with long-term caching via `nginx.conf`.
- Add TLS / reverse proxy separately if exposing beyond LAN.

## License
MIT

## Security
Current container security scan (Docker Scout) for `casatunes-ui:latest`:

- Base image: nginx:1-alpine (Alpine)
- Image size: ~22 MB, 83 packages indexed
- Vulnerabilities: 0 Critical / 0 High / 1 Medium / 1 Low
- Affected package: libxml2 2.13.4-r5
	- MEDIUM CVE-2025-32414 (fixed in 2.13.4-r6)
	- LOW    CVE-2025-32415 (fixed in 2.13.4-r6)

Recommended remediation:
1. Rebuild after base image refresh (pull newer nginx:1-alpine once it includes libxml2 2.13.4-r6 or switch to `nginx:1.29.0-alpine3.22` / `nginx:1-alpine-slim`).
2. Optionally switch to a slim variant (`nginx:1-alpine-slim`) to reduce packages (drops both current CVEs).

Re-scan command (local):
```bash
docker scout cves casatunes-ui:latest
```

This section should be updated after each release build.
