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

Student Portal is a full-stack student-facing information and campus-resource prototype developed as an independent high-school software engineering project. 

It grew from an idea I had while participating in student activities: useful events, resources, support channels, and practical information often exist, but students may not know where to find them. The project explores how those resources could be organized into one accessible portal while keeping sensitive data and institution-specific operations outside the application.

The project focuses on full-stack architecture, authentication and
authorization, database-backed content management, validation, auditability,
and safe handling of configuration and application state.

It is a software engineering demonstration, not a production school
information system.

## Project story
I started this project after noticing a simple problem in everyday school life: a lot of useful information and support already existed, but students did not always know where to find it.
As a student involved in student activities, I often saw classmates miss events, overlook useful campus resources, or simply not know who to ask when they needed information. Some resources were scattered across different pages, documents, offices, forms, or announcements. My original idea was therefore quite simple: build one public-facing place where students could see what was happening, discover opportunities to participate, find commonly used campus resources, and better understand where to go for help.
Over time, the project became much larger than the original frontend prototype. I rebuilt it into a full-stack application with a React/TypeScript frontend, an Express API, PostgreSQL persistence, authenticated administration, server-side authorization, validation, audit logging, migrations, and automated testing. The browser is treated as an untrusted client, with authorization enforced by the API rather than only by frontend route guards.   
The development process was far from smooth. Several problems only became obvious after repeated testing and review—for example, institution-local dates were initially affected by UTC boundaries, the frontend port and allowed Origin could drift apart, a migration advisory lock was released with the wrong key, and the first health-check design did not properly distinguish an API process being alive from the database and schema actually being ready. Those issues were investigated and corrected rather than hidden behind the prototype label.   
I also deliberately removed or avoided features when their long-term cost or governance requirements seemed larger than their value. For example, I did not keep a student posting/forum system, because user-generated content would require moderation, complaint handling, ownership, and long-term responsibility. In the same spirit, I tried to avoid turning the portal into a database of sensitive student information. Earlier plans involving health, counseling, safety, and feedback were reduced to neutral directory-style or placeholder content instead of storing medical history, safeguarding reports, counseling notes, or private feedback.   Pasted text
The public version of this repository goes even further: all institution-specific names, contacts, operational procedures, and sensitive school-specific content have been removed or generalized. The remaining content is fictional or demonstrative. The project is not intended to provide medical, safeguarding, administrative, or other professional advice.
This is also intentionally not a production school information system. I stopped before implementing institution-specific identity, hosting, managed databases, backups, monitoring, production secrets, content approval workflows, and other operational infrastructure, because those decisions depend on the environment in which a real school would actually deploy and maintain the system.   
For me, the most important result is not that the portal became “finished” in the production sense. It is that a fairly rough student idea survived several redesigns, technical mistakes, security reviews, database changes, and many bugs—and eventually became a coherent full-stack prototype that can be inspected, run locally, and used as a record of what I learned while building it.

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
