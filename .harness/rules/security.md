# Security Rules

## High-Risk Topics

- Authentication and authorization.
- Secrets, tokens, cookies, and sessions.
- File uploads.
- SQL or query construction.
- XSS, CSRF, SSRF.
- Production deployment.

## Requirements

- Do not hardcode secrets.
- Do not expose internal errors directly to users.
- Validate input.
- Enforce permission checks on the server side when applicable.
