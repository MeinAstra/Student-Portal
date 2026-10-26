# Architecture

## Shape

The project is a modular monolith with three code boundaries:

1. `apps/web` renders public information and a local-only administration experience.
2. `apps/api` owns authentication, authorization, validation, persistence, and audit events.
3. `packages/contracts` defines the accepted data shapes shared by both applications.

PostgreSQL uses explicit tables, constraints, foreign keys, visibility fields, date constraints, and versioned migrations. The API exposes `/api/v1` REST endpoints. There are no microservices, queues, distributed caches, GraphQL, or cloud-specific components.

The GitHub Pages edition is a separate build mode of `apps/web`. It compiles `src/static` and its curated version-controlled text into a read-only React site with hash routes under `/Student-Portal/`. It makes no API request and requires neither Express nor PostgreSQL. The full-stack build remains available for local engineering review; it is not deployed by the Pages workflow.

## Trust boundaries

- Browser route guards are usability controls only. The API independently requires a valid server session and `content_admin` role for administration.
- Session identifiers are opaque random values stored only as SHA-256 hashes in the database. Cookies are HttpOnly, SameSite, and Secure in production. Unsafe requests also require an allowed Origin and per-session CSRF token.
- Zod validates every mutation before PostgreSQL applies its own constraints.
- Each mutation and its audit event commit in one database transaction. Audit events record actor, action, entity type, entity identifier, request identifier, and time; they intentionally exclude request bodies, passwords, cookies, and tokens. Local administrators can inspect the latest events through the protected API and workspace.
- External URLs are normalized, require HTTPS, and cannot contain embedded credentials. A real institution may add a domain allowlist as a production hardening policy.

## Replacement points

A real deployment would replace local credential authentication with an organization-approved identity provider, provide managed database and asset storage, decide its allowed external domains, and configure monitoring/backups. Those replacements belong behind the API boundary; the public reference project does not imitate any institution's infrastructure.
