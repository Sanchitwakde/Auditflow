# AuditFlow

AuditFlow is a lightweight, organization-scoped audit management application for planning audits, recording findings, assigning corrective actions, and retaining an activity trail.

## Implementation

The repository contains a TypeScript Express/Mongoose API and a Vite/React client using React Router, TanStack Query, React Hook Form, Zod, Tailwind CSS, Recharts, and Lucide icons. It implements registration, login/logout/current-user, cookie-based authentication, CSRF protection, role checks, organization isolation, audit CRUD, finding CRUD with resolution validation, corrective-action tracking, dashboard aggregation, activity logging, pagination, filters, health/readiness checks, Helmet, CORS allowlisting, request validation, rate limiting, and centralized errors. The client includes responsive navigation, dashboard metrics, charts, validated create/edit dialogs, list filters, pagination, loading/error/empty states, and real API mutations.

## Structure

```
client/src/main.tsx       React UI, routing shell, query state, forms
client/src/styles.css     responsive design system
server/src/app.ts         HTTP routes and middleware
server/src/models.ts      Mongoose schemas and indexes
server/src/config.ts      validated environment configuration
server/src/server.ts      Mongo connection and graceful shutdown
docker-compose.yml        MongoDB + API + Nginx client
```

## Prerequisites and environment

Node.js 22+, npm, and a local MongoDB Community Server. Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`.

Backend variables: `NODE_ENV`, `PORT`, `MONGODB_URI`, `CLIENT_ORIGIN`, `JWT_SECRET` (at least 32 characters), `COOKIE_SECURE`, and `LOG_LEVEL`. The client only needs `VITE_API_BASE_URL`; never put server secrets in `VITE_*` values.

## Local development

```powershell
npm install
# first setup only: copy server/.env.example to server/.env
npm run dev
```

Open http://localhost:5173 and register the first workspace administrator. The API is at http://localhost:4000; checks are `/health` and `/ready`.

### MongoDB setup options

Choose one of these options before starting the API:

1. Docker Desktop (recommended on Windows):

```powershell
docker compose up mongo -d
docker compose ps
```

The included `server/.env` should use:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/auditflow
```

2. A locally installed MongoDB Community Server: start the MongoDB Windows service, then use the same `MONGODB_URI` above. MongoDB Compass can connect with `mongodb://127.0.0.1:27017` to inspect the `auditflow` database.

3. MongoDB Atlas: create a database user, allow the backend machine's IP address in Network Access, and set `MONGODB_URI` to the Atlas connection string. URL-encode special characters in the database password, for example:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.example.mongodb.net/auditflow?retryWrites=true&w=majority
```

Verify the connection before opening the frontend:

```powershell
Invoke-RestMethod http://localhost:4000/health
Invoke-RestMethod http://localhost:4000/ready
```

Both should report a successful database connection. If the API exits with missing `MONGODB_URI`, `CLIENT_ORIGIN`, or `JWT_SECRET`, create `server/.env` from `server/.env.example`; the API intentionally refuses to start without these values.

For explicit development/demo data, after MongoDB is available run `npm run seed --workspace server`. This wipes only the configured development database and creates `admin@example.com` / `ChangeMe123!`; never run it against production.

Keep MongoDB running as a local Windows service. Docker deployment files are not used by the local development workflow.

## API

All business endpoints use `/api/v1`. Authentication is `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, and `GET /auth/me`. Audits, findings, and actions expose collection GET/POST and item GET/PATCH/DELETE where permitted. Dashboard summary is `GET /dashboard/summary`; activity is `GET /activity`; admin member access is `GET /users` and `PATCH /users/:id/role`.

Collections accept `page`, `limit` (capped at 100), `search`, and filters including `status`, `severity`, `auditId`, `assignedOwner`, and `priority`. Authenticated users can use `/users/assignable` for organization-scoped assignment choices; full member administration remains restricted to admins.

## Quality checks

```powershell
npm run lint
npm test
npm run build
```

Vitest runs isolated API tests using `mongodb-memory-server`, plus client validation tests. The suite covers registration/login, invalid credentials, CSRF, RBAC, organization isolation, audit/finding/action flows, completion validation, dashboard aggregation, activity logging, invalid IDs, pagination, and core form validation. Never point tests at production.

## Deployment

Build and deploy `server` to a Node-capable host and `client` to a static host or the included Nginx container. Create a least-privilege MongoDB Atlas user, restrict network access to the backend, set `MONGODB_URI`, `CLIENT_ORIGIN` to the exact HTTPS frontend origin, a long random `JWT_SECRET`, and `COOKIE_SECURE=true`. Use HTTPS because the authentication cookie is HttpOnly and secure in production. Set `VITE_API_BASE_URL` to the deployed API `/api/v1` URL at client build time.

Enable Atlas continuous backups or scheduled snapshots, test restores into a separate database, and monitor `/health`, `/ready`, MongoDB connectivity, error rate, and origin/cookie configuration.

## Security and limitations

Passwords are bcrypt-hashed; passwords and tokens are not returned. Server-side organization filters are applied to record lookups, with role checks on mutations. Helmet, explicit CORS, rate limits, bounded JSON bodies, Zod validation, request correlation IDs, structured logging, and safe production error messages are enabled. Mutating requests require a CSRF token paired with the SameSite cookie. Deployments with cross-site frontend/API origins must review cookie policy, HTTPS, and origin configuration before setting `SameSite=None`.

Evidence is currently stored as descriptions/external references, not uploads. Object-storage upload integration, richer member invitations, and browser-level end-to-end tests are future increments. Activity logs are append-only through the application interface but are not cryptographically tamper-proof; restrict database write permissions and use Atlas auditing/backups for stronger controls. Audit reference generation uses random server-generated references; a counter/transaction can be added for strict sequential references at very high concurrency.
