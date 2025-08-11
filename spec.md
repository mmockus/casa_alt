> Placeholder Policy: Internal hosts are intentionally represented as `<CASATUNES_HOST>` or `<YOUR-CASA-IP>` to avoid leaking private infrastructure details.

## 📝 Casatunes API Documentation and Base URL

- The Casatunes API documentation is available at: `http://<CASATUNES_HOST>/casadev/API.aspx`
- **Important:** All actual API calls from the UI must use the base URL pattern: `http://<CASATUNES_HOST>:8735/api/v1`
- Replace `<CASATUNES_HOST>` with the hostname or IP of your Casatunes server (kept as a placeholder here to avoid publishing internal LAN IPs). The app requires this to be provided at build time via `REACT_APP_API_BASE`.

### Example (Group/Share Rooms):
- To group/share music from one zone to another, use:
  - `POST http://<CASATUNES_HOST>:8735/api/v1/zones/{zoneId}/share/{targetZoneId}`
  - Both `zoneId` and `targetZoneId` can be a ZoneID, Zone Name, or Persistent ZoneID.
# Prompt Instructions

You are an expert at generating software specifications. You will use your own knowledge and this template to gather information for the design of the software. You will prompt the user and work in setions to gather the requirements.

# Spec template

## 🗂 1. Overview
- **Name**: Casatunes Alternate User Interface
- **Summary**: A web-based UI that provides a completely unique interface for controlling Casatunes, leveraging the Casatunes API stack.
- **Primary Goal**: Enable household members to control Casatunes through a custom, user-friendly web interface.
- **Key Outcomes**:
  - 100% unique UI distinct from the default Casatunes interface
  - Seamless integration with Casatunes API
  - Intuitive controls for all household users

---

## 🛠 2. Capabilities & Use Cases
  - Show a play progress bar for the current song in the selected room, updating in real time.
  - The app must refresh and stay aware when a song changes (e.g., update UI when track changes automatically).
- **Core Capabilities**:

  - Display a list of all available rooms for control
  - Select a room to control (dropdown, no extra header, selected room is highlighted only in dropdown)
  - Show any room that is currently on
  - Basic media controls: play/pause toggle (single button), skip
  - Play/pause toggle button: If the room is playing, show the "pause" icon; clicking it sends the "pause" command and switches to the "play" icon. If the room is paused, show the "play" icon; clicking it sends the "play" command and switches to the "pause" icon. The icon updates optimistically for responsiveness.
  - Album art: Display album art above the controls for the selected room, if available from the API. Album art should be a square and not cropped.
  - Song title: Always display the full song title. If it is too long to fit, use a horizontal scrolling marquee effect.
  - Album title: Display on a single line, truncate with ellipsis if too long.
  - Artist: Display centered under the song title.
  - All Now Playing text (title, artist, album) should be centered in the UI.
  - Error logging: All API errors are logged and visible in a log viewer in the UI.
  - Room selection: Use a dropdown for room selection, with a colored icon indicating power state.
  - All controls (power, play/pause, skip, volume) are directly wired to the Casatunes API endpoints.
  - UI state refresh: The UI refreshes state after each action to stay in sync with the backend.
  - Control and display volume for each room
  - Turn on a room
  - Add rooms to a room group for synchronized playback
  - Display song length and current playback position
  - Show album art, artist, and song information
  - "All Off" button to turn off all rooms

## 🖥️ 2a. UI/UX Implementation Notes
- The default selected room is "office" on initial load.
- The room selector dropdown should not have a header or extra text; only the dropdown is visible.
- The selected room is only highlighted in the dropdown, not displayed elsewhere.
- Album art is always square (1:1 aspect ratio) and centered.
- Song title uses a marquee effect if too long to fit; album title is always single-line with ellipsis.
- All Now Playing text is centered.

- **Primary Behaviors / Use Cases**:
  - As a user, I want to see all available rooms so that I can choose which one to control.
  - As a user, I want to see which rooms are currently on so that I know what is active.
  - As a user, I want to control playback (play, pause, skip) in a selected room so that I can manage music easily.
  - As a user, I want to control the volume and see the current volume for each room so that I can adjust sound levels as needed.
  - As a user, I want to turn on a room so that I can start music in that space.
  - As a user, I want to group rooms together so that music plays in multiple rooms at once.
  - As a user, I want to see the song's progress and details so that I know what's playing.
  - As a user, I want to turn off all rooms with a single action for convenience.

---

## 🌐 3. Interfaces & Entry Points
- **Interfaces Provided**:
  - Web interface (browser-based UI)
- **Protocols/Formats**:
  - JSON (for all API communication)
- **Auth Model**:
  - None (no authentication required for UI or API)

---

## 🧮 4. Data & Storage
- **Input Data**:
  - All state and control data is accessed from the Casatunes API; no local data is required.
- **Output Expectations**:
  - UI displays real-time data from the Casatunes API; no data is persisted by the UI.
- **Storage Mechanism**:
  - No storage required; all state is managed by the Casatunes server.
- **Retention & Lifecycle**:
  - Not applicable; no data is stored by the UI.

---

## 🔗 5. Dependencies & Integrations
- **Outbound Dependencies**:
  - Casatunes API (for all control and state operations)
- **Inbound Triggers/Events**:
  - None; all interactions are initiated by the UI.
- **Rate Limits / Retries / Idempotency**:
  - No special requirements or concerns at this time.

---

## ⚙️ 6. Runtime & Concurrency
- **Language/Environment**:
  - Web application; React with Material UI recommended for a modern, polished look and large community support. (Python can be used for backend/API proxy if needed, but frontend will use JavaScript/TypeScript.)
- **Concurrency Model**:
  - Single user, single session; minimal concurrency concerns. UI may make multiple async API calls as needed.
- **State Handling**:
  - Stateless; all state is managed by the Casatunes API, with no persistent state in the UI.

---

## 🧑‍🔧 7. Operational Characteristics
- **Performance Targets**:
  - UI should be lightweight, snappy, and modern in appearance; no strict latency or throughput requirements.
- **Resilience & Failure Modes**:
  - No special resilience needs; if the UI or API fails, user can simply reload the page.
- **Observability Requirements**:
  - No logging, metrics, or tracing required at this time.
- **UI Platform Focus**:
  - Desktop browser focus for initial release; mobile and tablet support may be considered in the future.
- **Accessibility/Internationalization**:
  - No requirements for accessibility or internationalization at this time.
- **UI Toolkit**:
  - Material UI (MUI) for React to provide a polished, modern look out-of-the-box.
- **Drag-and-Drop**:
  - No drag-and-drop UI builder required; code-based UI development preferred.

---

## 🔒 8. Security & Privacy
- **Threat Surface**:
  - No secrets or sensitive data; API is completely open.
- **Authentication & Authorization**:
  - No authentication or authorization required.
- **Encryption & Secret Mgmt**:
  - No special encryption or secret management needs.

---

## 🧪 9. Testing & Validation
- **Test Types**:
  - Manual testing for initial development; automated/unit testing can be added later as needed.
- **Validation Rules**:
  - None specified at this time.
- **Synthetic or Generated Data Strategies**:
  - Not required for initial development.

---

## 📦 10. Packaging & Deployment
- **Delivery Targets**:
  - Docker container (as lightweight as possible, e.g., using Alpine base image)
- **Deployment Targets**:
  - Homelab Docker server (<YOUR_DOCKER_HOST>)
  - Local Docker Desktop for testing
- **CI/CD Needs**:
  - To be added later; initial deployments will be manual.

---

## 📚 11. Documentation & Support
- **Docs Required**:
  - Autogenerated documentation in README.md (API reference, config, usage, workflows, errors)
- **Formats & Tooling**:
  - Markdown (README.md in GitHub)
- **Support Channels**:
  - None required; for personal use only

---

## ✅ 12. Acceptance Criteria
  - Play progress bar is visible and updates in real time for the current song
  - UI automatically updates when the song changes (track change awareness)
- **Definition of Done**:
  - Able to start the Docker container on localhost
  - Able to access the UI via the published port
  - Able to select a room, see what is playing (including album art), and use all controls (play/pause toggle, skip, volume, group, all off)
  - Volume control and display works for each room
  - Play/pause toggle button works as specified, with immediate icon update and correct API calls
  - Album art is shown if available
  - Error log viewer displays API errors
- **Success Metrics**:
  - All household members can use the UI for daily Casatunes control
  - No major errors or failures in normal use
  - UI is responsive and intuitive

# Copilot instructions

Instructions to help copilot build this out are below

## What I am replacing

look at this app as a baseline for the UI, we can make this better

http://<CASATUNES_HOST>/casatunesx/#/room-detail-view