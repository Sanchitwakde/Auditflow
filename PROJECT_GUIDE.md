# AuditFlow project guide

AuditFlow is an organization-scoped audit-management application. It helps a team plan audits, record findings, assign corrective actions, monitor risk, and retain an activity trail.

This document explains what the project contains, why the pieces exist, when they are used, and how the environment file controls the application.

## 1. What the project does

The application has three main business records:

1. **Audits** — planned or active reviews of a process, department, system, or control area.
2. **Findings** — problems or risks discovered during an audit.
3. **Corrective actions** — remediation tasks connected to findings.

Users belong to an organization. Every audit, finding, action, and activity record is associated with that organization. This prevents one organization's users from reading or changing another organization's data.

The normal workflow is:

```text
Register workspace
      ↓
Create audit
      ↓
Record finding
      ↓
Assign corrective action
      ↓
Track status and due dates
      ↓
Review dashboard and activity log
```

## 2. Repository layout

```text
auditop/
├─ client/                 React + Vite frontend
│  ├─ src/main.tsx         UI, routes, forms, API client, dashboard
│  ├─ src/styles.css       Main responsive visual design
│  ├─ src/tailwind.css     Tailwind entry point
│  ├─ src/extra.css        Additional UI styles
│  ├─ validation.test.ts   Frontend validation tests
│  ├─ vite.config.ts       Dev-server configuration
│  └─ .env.example         Frontend environment example
├─ server/                 Express + MongoDB backend
│  ├─ src/app.ts           Middleware and all API routes
│  ├─ src/config.ts        Environment validation
│  ├─ src/models.ts        MongoDB/Mongoose schemas and indexes
│  ├─ src/server.ts        Database connection and HTTP startup
│  ├─ src/seed.ts          Development/demo data loader
│  ├─ tests/               API and smoke tests
│  └─ .env.example         Backend environment example
├─ package.json            Root workspace scripts
├─ package-lock.json       Locked npm dependency versions
├─ index.html              Root HTML file
├─ audi.json               Example/export-shaped audit data
└─ README.md               Quick-start project documentation
```

`node_modules`, build output, coverage, and real `.env` files are ignored by Git. Only `.env.example` files are intended to be committed.

## 3. Technology choices

### Frontend

- **React 19** renders the interface.
- **Vite** provides the development server and production build.
- **React Router** switches between dashboard, audits, findings, actions, activity, and settings views.
- **TanStack Query** loads, caches, refreshes, and mutates API data.
- **React Hook Form + Zod** handle form state and client-side validation.
- **Recharts** draws dashboard charts.
- **Lucide React** supplies icons.
- **Tailwind/PostCSS plus custom CSS** support styling and responsive layouts.

### Backend

- **Express** exposes HTTP endpoints.
- **Mongoose** maps JavaScript/TypeScript objects to MongoDB documents.
- **Zod** validates environment variables and request bodies.
- **bcryptjs** hashes passwords.
- **jsonwebtoken** creates the eight-hour authentication cookie token.
- **cookie-parser** reads authentication and CSRF cookies.
- **Helmet** adds common security headers.
- **CORS** allows only the configured frontend origin.
- **express-rate-limit** limits login and registration attempts.
- **Pino** provides structured server logging.
- **Vitest, Supertest, and mongodb-memory-server** support automated API tests without using a real database.

## 4. Environment files

The backend reads `server/.env` through `dotenv`. The configuration is parsed in `server/src/config.ts` before the server starts. If a required value is missing or invalid, startup stops intentionally instead of running with unsafe or ambiguous settings.

The current development `server/.env` contains local development settings. Its secret value is intentionally not reproduced here. Keep that file private and replace the secret before sharing or deploying the application.

### Backend variables

| Variable | What it means | Why it exists | When it matters |
|---|---|---|---|
| `NODE_ENV` | Runtime mode: `development`, `test`, or `production` | Enables environment-specific behavior, especially test CSRF behavior and seed protection | Set `test` only for tests, and `production` for deployment |
| `PORT` | API listening port | Tells Express where to accept requests | The default is `4000`; the frontend expects this in local development |
| `MONGODB_URI` | MongoDB connection string | Tells Mongoose which database to use | Required every time the API starts |
| `CLIENT_ORIGIN` | Exact browser origin allowed by CORS | Prevents unrelated websites from calling the cookie-authenticated API | Must match the frontend origin, such as `http://localhost:5173` |
| `JWT_SECRET` | Private signing key for login tokens | Allows the API to verify that an authentication cookie was issued by this server | Must be at least 32 characters; use a long random value in production |
| `COOKIE_SECURE` | Whether cookies require HTTPS | Prevents cookies from being sent over plain HTTP | `false` locally; `true` with HTTPS in production |
| `LOG_LEVEL` | Pino logging verbosity | Controls how much diagnostic information the server emits | `info` is suitable for development and normal operation; tests use `silent` |

A safe local backend example is:

```env
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/auditflow
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=use-a-long-random-development-secret-at-least-32-chars
COOKIE_SECURE=false
LOG_LEVEL=info
```

### Frontend variable

`client/.env.example` defines:

```env
VITE_API_BASE_URL=http://localhost:4000/api/v1
```

Vite exposes variables beginning with `VITE_` to browser code. Therefore, `VITE_API_BASE_URL` may contain a URL, but must never contain passwords, JWT secrets, database credentials, or private keys. The frontend falls back to `http://localhost:4000/api/v1` when this variable is absent.

For a deployed frontend, set `VITE_API_BASE_URL` to the public API's `/api/v1` URL at build time.

## 5. Authentication and request security

1. The browser first receives an `auditflow_csrf` cookie.
2. Registration or login validates the submitted credentials.
3. Passwords are stored as bcrypt hashes, never as plain text.
4. On successful authentication, the API creates an eight-hour, HttpOnly `auditflow` cookie containing a JWT.
5. The frontend sends cookies with `credentials: 'include'`.
6. Every mutating request (`POST`, `PATCH`, `PUT`, or `DELETE`) must send the CSRF value in `X-CSRF-Token` and match the CSRF cookie.
7. The authentication middleware verifies the JWT, loads the active user, and adds the user's ID, organization, and role to the request.

The three roles are:

- **Admin** — full workspace and member administration.
- **Auditor** — create and edit audits, findings, and corrective actions.
- **Viewer** — read access, without creation or editing privileges.

Server-side organization filters are applied to record lookups. This is important: hiding a UI button is not considered authorization; the API checks permissions itself.

## 6. Data model

### Organization

Represents a workspace. It owns users and all business records.

### User

Stores name, normalized email, bcrypt password hash, role, organization, and active/inactive state. Email addresses are unique across the database.

### Audit

Stores title, generated reference, description, scope, department, audit type, assigned auditor, dates, status, priority, creator, and organization.

Statuses: `planned`, `in_progress`, `completed`, `cancelled`.

### Finding

Belongs to an audit and records description, category, severity, risk assessment, evidence reference, owner, recommended action, resolution dates, and notes.

Statuses: `open`, `in_progress`, `resolved`, `accepted_risk`.

Only an administrator may mark a finding as `accepted_risk`. Resolution notes are required when resolving a finding.

### CorrectiveAction

Belongs to a finding and stores the task description, owner, due date, priority, completion notes, and completion timestamp.

Statuses: `pending`, `in_progress`, `completed`, `blocked`.

Completion notes are required when an action is marked complete.

### ActivityLog

Records important changes such as creation, updates, deletions, role changes, and account activation changes. Each entry includes the actor, entity, changed fields, organization, and request correlation ID.

## 7. API overview

All business routes start with `/api/v1`.

### Authentication

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/auth/csrf` | Returns the browser's CSRF token |
| `POST` | `/auth/register` | Creates an organization and its first admin |
| `POST` | `/auth/login` | Authenticates a user |
| `POST` | `/auth/logout` | Clears the authentication cookie |
| `GET` | `/auth/me` | Returns the current authenticated user |

### Business records

Audits, findings, and actions each support collection `GET`/`POST` and item `GET`/`PATCH`/`DELETE` routes:

```text
/audits
/audits/:id
/findings
/findings/:id
/actions
/actions/:id
```

Collection endpoints support pagination using `page` and `limit` (maximum 100), plus search and domain-specific filters.

### Dashboard and administration

```text
GET /dashboard/summary
GET /dashboard/audit-status
GET /dashboard/finding-severity
GET /dashboard/overdue-actions
GET /activity
GET /organization
GET /users/assignable
GET /users
PATCH /users/:id/role
PATCH /users/:id/status
```

`/users`, role changes, and account status changes require an administrator. The API prevents an administrator from removing their own admin role and prevents the last active administrator from being deactivated.

### Operational checks

- `GET /health` confirms the API is responding and reports whether MongoDB is connected.
- `GET /ready` returns `200` only when MongoDB is connected; otherwise it returns `503`.

These endpoints are useful for local troubleshooting, deployment health checks, and monitoring.

## 8. Running the project locally

Prerequisites: Node.js 22 or newer, npm, and MongoDB. MongoDB can be a local service, Docker container, or MongoDB Atlas database.

```powershell
npm install
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
npm run dev
```

Open:

- Frontend: `http://localhost:5173`
- API: `http://localhost:4000`
- API health: `http://localhost:4000/health`
- API readiness: `http://localhost:4000/ready`

If MongoDB runs locally, the usual connection is:

```text
mongodb://127.0.0.1:27017/auditflow
```

The root `dev` script starts both workspaces concurrently. You can also run them separately:

```powershell
npm --workspace server run dev
npm --workspace client run dev
```

## 9. Demo data and seed behavior

Run the seed command only against a disposable development database:

```powershell
npm run seed --workspace server
```

The seed script deletes existing organizations, users, audits, findings, and corrective actions in the configured database, then creates a demo workspace with:

```text
Email:    admin@example.com
Password: ChangeMe123!
```

The script refuses to run when `NODE_ENV=production`. This is a safety check, but the database URI must still be verified before running the command.

## 10. Quality checks

```powershell
npm run lint
npm test
npm run build
```

- `lint` runs TypeScript checks without emitting files.
- `test` runs server API tests and client validation tests.
- `build` compiles the server and creates the Vite production bundle.

The API tests use an in-memory MongoDB server and verify registration, login, CSRF, role checks, organization isolation, CRUD flows, validation rules, dashboard aggregation, activity logging, malformed IDs, pagination, and administrator protection.

## 11. Deployment guidance

For production:

1. Use a managed MongoDB database or a secured MongoDB server.
2. Create a least-privilege database user.
3. Restrict database network access to the backend.
4. Set a long random `JWT_SECRET` that is different from every development secret.
5. Set `CLIENT_ORIGIN` to the exact HTTPS frontend origin.
6. Set `COOKIE_SECURE=true` and serve the API over HTTPS.
7. Build the frontend with the deployed API URL in `VITE_API_BASE_URL`.
8. Configure backups, restore testing, logs, and health/readiness monitoring.

The authentication cookie is HttpOnly and cannot be read by frontend JavaScript. Cross-site frontend/API deployments require a deliberate review of cookie `SameSite` policy, HTTPS, CORS, and origin configuration.

## 12. Current limitations and future work

- Evidence is currently saved as descriptions or external references, not uploaded files.
- There is no full invitation workflow for adding members.
- Browser-level end-to-end tests are not included.
- Activity logs are append-only through the application, but are not cryptographically tamper-proof.
- Audit references use random server-generated values rather than a transaction-backed sequential counter.
- `audi.json` is sample data, not the live database or an automatic import source.

## 13. Troubleshooting

### The API refuses to start

Check that `server/.env` exists and contains valid `MONGODB_URI`, `CLIENT_ORIGIN`, and a `JWT_SECRET` with at least 32 characters. Also confirm that `PORT` is available.

### The frontend cannot reach the API

Check that the server is running on port 4000, open `/health`, and verify `VITE_API_BASE_URL`. Restart Vite after changing a client `.env` file because Vite reads environment variables at startup/build time.

### Login or mutations return a CSRF error

Use the same browser origin configured by `CLIENT_ORIGIN`, keep cookies enabled, and do not call the API from a different origin. The frontend must request and send the CSRF cookie/token pair.

### The frontend loads but shows no data

Check `/ready`, confirm MongoDB is running, and inspect the API response in the browser network panel. A successful `/health` response only means the API process is alive; `/ready` confirms database readiness.

### A user cannot edit records

Verify the user's role. Viewers can read records but only admins and auditors can create or edit audits, findings, and corrective actions. Only admins can delete records or manage members.

## 14. Important security reminders

- Never commit `server/.env` or `client/.env`.
- Never place backend secrets in a `VITE_*` variable.
- Never use the demo password in production.
- Never run the seed command against a production database.
- Use HTTPS and `COOKIE_SECURE=true` in production.
- Rotate the JWT secret if it is exposed; existing login cookies will then become invalid.
- Treat database backups and logs as sensitive because they may contain operational data.
