// Central configuration for API endpoints.
// New ENV expectation:
//   REACT_APP_API_BASE  => protocol + host ONLY (no trailing slash, no port, no /api/v1)
//   REACT_APP_API_PORT  => port number (optional; defaults to 8735)
// The code will append ':<port>/api/v1'.
// Backward compatibility:
//   - If REACT_APP_API_BASE mistakenly contains /api/v1, it will be stripped.
//   - If REACT_APP_API_BASE includes a port and REACT_APP_API_PORT is not set, that port is used but a warning is emitted.
//   - If both specify different ports, REACT_APP_API_PORT takes precedence and a warning is emitted.

const DEFAULT_HOST = 'http://casaserver.local';
const DEFAULT_PORT = '8735';

const rawBaseInput = (process.env.REACT_APP_API_BASE || DEFAULT_HOST).replace(/\/$/, '');
// Strip legacy path
const withoutPath = rawBaseInput.replace(/\/api\/v1$/,'');

let parsed: URL | null = null;
try { parsed = new URL(withoutPath); } catch { /* ignore invalid URL; fallback later */ }

let hostProtocol = DEFAULT_HOST.split('://')[0];
let hostName = DEFAULT_HOST.split('://')[1];
let portFromBase: string | undefined;

if (parsed) {
	hostProtocol = parsed.protocol.replace(':','');
	hostName = parsed.hostname;
	if (parsed.port) portFromBase = parsed.port; // only if user embedded it
}

const envPort = process.env.REACT_APP_API_PORT?.trim();
let finalPort = envPort || portFromBase || DEFAULT_PORT;

// Warnings for misconfigurations
if (!process.env.REACT_APP_API_BASE) {
	// eslint-disable-next-line no-console
	console.warn(`[config] REACT_APP_API_BASE not set – defaulting to ${DEFAULT_HOST}`);
}
if (portFromBase && envPort && portFromBase !== envPort) {
	// eslint-disable-next-line no-console
	console.warn(`[config] Port mismatch: base URL included port ${portFromBase} but REACT_APP_API_PORT=${envPort}. Using ${finalPort}. Remove the port from REACT_APP_API_BASE.`);
} else if (portFromBase && !envPort) {
	// eslint-disable-next-line no-console
	console.warn('[config] Detected port embedded in REACT_APP_API_BASE. Prefer using REACT_APP_API_PORT instead.');
}

export const API_BASE = `${hostProtocol}://${hostName}${finalPort ? ':'+finalPort : ''}/api/v1`;

// Canvas API endpoint (external service providing canvas video given a Spotify track ID)
// Must be exposed at build time in CRA, so we prefer REACT_APP_CANVAS_API but also check unprefixed for dev convenience.
// Now also fetches from /config.json at runtime for dynamic configuration.
const getCanvasApi = async (): Promise<string> => {
  // Try runtime config first
  try {
    const response = await fetch('/config.json');
    if (response.ok) {
      const config = await response.json();
      if (config.CANVAS_API) return config.CANVAS_API.replace(/"/g, '');
    }
  } catch (e) {
    // Ignore fetch errors, fall back to build-time
  }
  // Fallback to build-time env
  return (process.env.REACT_APP_CANVAS_API || (process.env as any).CANVAS_API || '').replace(/"/g, '');
};

// Default Canvas fallback video (previously hardcoded). If provided, we persist to localSettings for future sessions.
const getCanvasDefaultVideo = async (): Promise<string> => {
  try {
    const response = await fetch('/config.json');
    if (response.ok) {
      const config = await response.json();
      if (config.CANVAS_DEFAULT_VIDEO) return config.CANVAS_DEFAULT_VIDEO.replace(/"/g, '');
    }
  } catch (e) {
    // Ignore
  }
  return (process.env.REACT_APP_CANVAS_DEFAULT_VIDEO || (process.env as any).CANVAS_DEFAULT_VIDEO || '').replace(/"/g, '');
};

// For synchronous use, provide promises
export const CANVAS_API_PROMISE = getCanvasApi();
export const CANVAS_DEFAULT_VIDEO_PROMISE = getCanvasDefaultVideo();

// For backward compatibility, export sync versions with defaults (will be empty if not set at build)
export const CANVAS_DEFAULT_VIDEO = (process.env.REACT_APP_CANVAS_DEFAULT_VIDEO || (process.env as any).CANVAS_DEFAULT_VIDEO || '').replace(/"/g, '');
