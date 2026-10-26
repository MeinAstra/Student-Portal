# Security notes

The GitHub Pages build is read-only and contains no Admin route, form submission, session handling, or API client. Its historical health and community-safety excerpts are presented as project writing, not a live institutional service. Publication still requires the owner's separate editorial approval.

## Implemented controls

- Read-only mode is the default; production startup rejects local write mode.
- Local credentials are created interactively and stored as salted scrypt hashes.
- Server-managed, expiring sessions; hashed session identifiers; HttpOnly/SameSite cookies.
- Origin and CSRF checks for unsafe requests.
- Server-side role checks for every administration endpoint.
- Shared strict request validation plus PostgreSQL constraints.
- HTTPS-only external URL metadata.
- Security headers and Content Security Policy via Helmet.
- Sensitive authentication and administration responses use `Cache-Control: no-store`; HSTS is enabled only in production mode.
- Rate limiting on login and administration mutations; small JSON body limit; generic error responses.
- Append-only audit events without request bodies or credentials.
- Structured request logs limited to request ID, method, path, and status.

## Production decisions intentionally left open

- Organization identity provider and account lifecycle.
- Managed secret storage, database, TLS termination, backups, monitoring, and retention.
- Approved-domain allowlist for external links and assets.
- Explicit non-loopback host binding for a real hosted deployment; local setup binds only to `127.0.0.1`.
- Infrastructure-specific rate-limit storage if a deployment later runs more than one API process.
- Formal content governance and approval for support-directory text.

Do not put real medical histories, counseling notes, safety reports, form responses, or private student records into this application. Report suspected vulnerabilities privately to the repository owner rather than using real personal data in a demonstration.
