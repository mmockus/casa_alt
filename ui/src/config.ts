// Central configuration for API endpoints
// Override via environment variable REACT_APP_API_BASE (Create React App standard)
// NOTE: No hard-coded LAN IP to avoid leaking internal network details. Configure via build arg or .env.
export const API_BASE = process.env.REACT_APP_API_BASE || 'http://<CASATUNES_HOST>:8735/api/v1';
if (!process.env.REACT_APP_API_BASE) {
	// Light runtime notice to help users remember to set it properly
	// (Will not spam because module evaluated once.)
	// eslint-disable-next-line no-console
	console.warn('[config] REACT_APP_API_BASE not set – using placeholder <CASATUNES_HOST>. Update your build args or .env.');
}
