# Student Portal

A full-stack student portal prototype built as an independent high-school
software engineering project.

> **Disclaimer**
> This project is not affiliated with or endorsed by any school or educational
> institution. All people, accounts, records, announcements, schedules, and
> operational content are fictional or demonstrative. Content is provided for
> demonstration only and does not constitute administrative, medical, legal,
> safeguarding, or other professional advice.

## Overview

Student Portal is a full-stack prototype exploring how a school-facing web
application could organize public information and authenticated administrative
workflows.

The project focuses on full-stack architecture, authentication and
authorization, database-backed content management, validation, auditability,
and safe handling of configuration and application state.

It is a software engineering demonstration, not a production school
information system.

## Features

- Public student-facing portal
- Authenticated administrative interface
- Role-based authorization
- Announcement/content management
- Campus map/content configuration
- PostgreSQL persistence and migrations
- Session-based authentication
- CSRF protection
- Input validation
- Audit logging
- Rate limiting
- Health/readiness endpoints
- Demo/seed data for local review

## Tech Stack

- TypeScript
- React
- Vite
- Node.js
- Express
- PostgreSQL
- Zod
- Docker / Docker Compose for local infrastructure

## Architecture

Browser
    ↓
React / Vite
    ↓
Express API
    ↓
PostgreSQL

Authorization and validation are enforced by the API rather than relying on
frontend visibility controls.

## Running Locally

[Use the actual commands already supported by this repository here.
Do not invent commands.]

See the setup documentation for configuration, migrations, demo data,
startup, teardown, and reset behavior.

## Demo Data

The repository uses fictional/demo users and content. No real student,
staff, medical, or institutional records are required to run the project.

## Security Notes

This prototype includes several application-security controls for educational
and engineering purposes, including server-side authorization, HttpOnly
sessions, CSRF protection, input validation, parameterized database access,
rate limiting, and audit logging.

These controls should not be interpreted as a claim that the application is
production-ready.

## Limitations

This is a prototype and intentionally does not implement all requirements of a
real institutional information system. Production deployment would require
institution-specific identity management, operational monitoring, backup and
recovery procedures, infrastructure hardening, policy/legal review, and other
deployment-specific controls.

## Project Status

The project is maintained primarily as a completed educational/portfolio
software engineering project rather than as a production service.

## License

Source code is available under the MIT License. See `LICENSE`.
