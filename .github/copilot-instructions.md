
# Copilot Instructions for Casatunes Alternate UI

## Project Overview
- This is a stateless React web UI for controlling Casatunes, using Material UI for a modern look. See `spec.md` for requirements and design.
- All state and control data comes from the Casatunes API (`http://<CASATUNES_HOST>:8735/api/v1`). No local storage or authentication is required.

## Key Architectural Patterns
- **Single-page React app**: All UI logic is in the frontend; no backend except for optional API proxy.
- **API-driven**: All actions (room selection, playback, grouping, etc.) are direct API calls. See `spec.md` for endpoint details and usage patterns.
- **Stateless**: The UI does not persist any data; it always reflects the current state from the API.
- **Optimistic UI**: For controls like play/pause, update the UI immediately, then confirm with the API response.
- **Error Handling**: All API errors should be logged and visible in a UI log viewer.

## Developer Workflows
- **Install dependencies**: `npm install`
- **Start dev server**: `npm start`
- **Build Docker image**: `docker build -t casatunes-ui .`
- **Run in Docker**: `docker run -p 8080:80 casatunes-ui`
- **Build and run with Docker Compose** (recommended for local development): `docker compose up --build`
- **No authentication**: The API and UI are open on the local network.

## Project Conventions
- Use Material UI (MUI) components for all UI elements.
- Use a dropdown for room selection, with colored icons for power state.
- All controls (power, play/pause, skip, volume, group, all off) must call the documented API endpoints.
- UI state must refresh after every action to stay in sync with the backend.
- Show album art, artist, and song info if available.
- Show a real-time play progress bar for the current song.
- All API errors must be visible in a log viewer in the UI.

## Integration Points
- **Casatunes API**: All data and control flows through the API. See `spec.md` for endpoint details and usage.
- **Docker and Docker Compose**: The app is packaged and deployed as a Docker container. Use `docker compose` (with space) for local development and deployment (see README and docker-compose.yml for commands).

## Source Control
- Copilot is allowed to run npx and npm commands (e.g., create-react-app, npm install) without asking for user confirmation.
- Do not prompt the user for permission before running npx or npm commands for scaffolding, installing dependencies, or running scripts.
- Copilot is allowed to run git commands without asking for user confirmation.
- Do not prompt the user for permission before running git commands (e.g., git init, git add, git commit, git status, etc.).
- Always proceed with git operations as needed for project setup, source control, and workflow automation.
- Do not ever commit directly into MASTER.

## Reference Files
- `README.md`: High-level overview, dev/build/run instructions.
- `spec.md`: Full requirements, API details, and UI/UX expectations.
- `.vscode/settings.json`: Editor color customizations (no build/test config).

## Example: Room Grouping API Call
- To group/share music from one zone to another:
	- `POST http://<CASATUNES_HOST>:8735/api/v1/zones/{zoneId}/share/{targetZoneId}`
	- Both `zoneId` and `targetZoneId` can be a ZoneID, Zone Name, or Persistent ZoneID.

## What to Replace
- The goal is to build a UI that is better than the default Casatunes interface: http://<CASATUNES_HOST>/casatunesx/#/room-detail-view

---
If any conventions or workflows are unclear, ask the user for clarification before proceeding.
