## Security Notes

This project intentionally avoids embedding any sensitive values.

What you will (not) find:
- No API keys, tokens, passwords, or private certificates.
- No internal LAN IPs committed; docs use `<CASATUNES_HOST>` / `<YOUR-CASA-IP>` placeholders.
- No analytics or tracking scripts.

Configuration:
- Primary variable: `REACT_APP_API_BASE` (Create React App pattern) – baked in at build time.
	Example: `REACT_APP_API_BASE=http://<YOUR-CASA-IP>:8735/api/v1`

Local Overrides:
- Copy `ui/.env.example` to `ui/.env` to set a local API base (ignored by Git if added to .gitignore; add if not present).

Reporting:
- If you believe you've found a security issue (e.g., accidental secret, dependency vulnerability), open a GitHub issue with details. Do not include any real secrets in the issue.

Hardening Ideas (Not Implemented Yet):
- Add a Content Security Policy via nginx.
- Enable HTTP security headers (X-Frame-Options, X-Content-Type-Options, etc.).
- Automated dependency scanning (GitHub Dependabot / CodeQL).
