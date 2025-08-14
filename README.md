docker compose up -d
docker scout cves casatunes-ui:latest
# myCasa (Casatunes Alternate UI)

myCasa is a lightweight, stateless React + Material UI frontend for controlling a CasaTunes whole‑home audio system. It intentionally has **no backend**: the UI reflects real‑time state pulled directly from the CasaTunes REST API and sends control commands the same way. Close the tab and reopen—state stays authoritative on the server.

See `spec.md` for the deeper functional/UX specification.

## Core Features
- Fast room (zone) selection with power state indicators
- Live now‑playing view: artwork, title, artist, album, progress bar
- Playback controls: play / pause / next / mute / volume slider (debounced)
- Room grouping (share music to other zones) & quick unshare (power off target)
- All actions optimistic but reconciled with server polling
- Color extraction from artwork for dynamic theming (accent hues)
- Theme selection (config driven)
- Resilient polling with `AbortController` cleanup
- Zero persistent local state besides user preferences (theme, last selected room)

## Technology Stack
| Layer | Choice | Notes |
|-------|--------|-------|
| UI | React (CRA) | Simplicity & fast iteration |
| Styling / Components | Material UI (MUI v7) | Consistent design system |
| Build | CRA / Webpack | Inlined build‑time env vars |
| Runtime | Nginx Alpine | Serves static bundle efficiently |
| Container | Multi‑stage Docker | Small final image |

## Environment Configuration (.env)
Environment variables are consumed at **build time** (Create React App pattern). Changing them requires a rebuild.

Root `.env` (used by both docker compose and direct builds):

```
REACT_APP_API_BASE=http://casaserver.local   # Protocol + host ONLY (no port, no trailing slash, no /api/v1)
REACT_APP_API_PORT=8735                      # CasaTunes API port (defaults to 8735 if unset)
DOCKER_APP_PORT=8080                         # Host port to publish the UI container on (docker-compose)
```

Rules:
- Do NOT append `/api/v1` – the UI code always adds it.
- If you accidentally include `:port` inside `REACT_APP_API_BASE`, a warning logs; prefer using `REACT_APP_API_PORT`.
- If `REACT_APP_API_BASE` is unset, it falls back to `http://casaserver.local`.
- If `REACT_APP_API_PORT` is unset, it defaults to `8735`.

### Quick Start (.env)
Create your env file from the provided template:
```
cp .env.example .env        # for builds / docker compose
# or
cp .env.example .env.local  # CRA dev server also picks up .env.local
```
Then edit:
```
vi .env   # adjust REACT_APP_API_BASE etc.
```

### Applying Changes
Because env vars are compiled in, run a new build:
```
cd ui
npm run build
```
Or rebuild the Docker image (see below).

## Local Development
```
cd ui
npm install
npm start
```
The dev server proxies static assets; API calls go directly to CasaTunes (ensure network reachability / CORS not restricted—CasaTunes API is assumed open on LAN).

## Production Docker Image
Multi‑stage build (Node -> Nginx):
```
docker build -t casatunes-ui .
docker run --rm -p 8080:80 casatunes-ui
```
Open: http://localhost:8080

### Override API Host / Port at Build Time
```
docker build \
	--build-arg REACT_APP_API_BASE=http://my-casatunes.local \
	--build-arg REACT_APP_API_PORT=8735 \
	-t casatunes-ui:custom .
```

### Using docker-compose
```
docker compose build
docker compose up -d
```
Opens at: http://localhost:${DOCKER_APP_PORT:-8080}

To change host port:
```
echo "DOCKER_APP_PORT=9000" >> .env
docker compose up -d --build
```

### Updating After Code / Env Changes
```
docker compose build casatunes-ui
docker compose up -d casatunes-ui
```

### Deploying Remotely
1. Copy repo or distribution bundle to target host.
2. Provide a production `.env` with correct host (e.g. `REACT_APP_API_BASE=http://casatunes.lan`).
3. `docker compose build --pull` (ensures fresh base image) or `docker build` if not using compose.
4. `docker compose up -d` (or `docker run -d -p 80:80 casatunes-ui`).
5. Put a reverse proxy / TLS (Caddy, Nginx, Traefik) in front if exposing outside LAN.

### Healthcheck
Container defines an HTTP healthcheck hitting `/` (index). For lighter weight you can add a `/health.txt` static file and adjust `nginx.conf` & Dockerfile HEALTHCHECK accordingly.

## Updating Favicon / Branding
SVG favicon at `ui/public/favicon-monkey-music.svg` (blue gradient “monkey with headphones”). PNG fallbacks (`favicon-16.png`, `favicon-32.png`) can be regenerated via an image tool (e.g. Inkscape or `rsvg-convert`). Update `index.html` if you rename assets.

## Theming
Themes are defined in `themeConfig.ts`. The selected theme persists in `localStorage` under `themeName`.

## Development Notes
- Polling uses `AbortController` to avoid leaks.
- Volume changes debounced (200ms) to reduce API spam.
- Grouping uses CasaTunes share/group endpoints (see `spec.md`).
- All errors should be surfaced in the planned log viewer (future enhancement if not yet implemented).

## Releasing
1. Bump version/branch (e.g. `0.x.y`).
2. `docker compose build --pull` or `docker build --pull`.
3. Run smoke test locally.
4. Tag & push (optionally publish container to registry).

## Security
Minimal static frontend; primary concern is sanitizing host exposure. No secrets are stored. Review CasaTunes API exposure scope before exposing UI publicly.

Previous sample container scan (update per release):
```
docker scout cves casatunes-ui:latest
```

## License
MIT

