# Premium Fresh Meat — User Management System

A beginner-friendly example of a React + Vite frontend, an Express REST API, and a MySQL 8 database. Authentication passwords are hashed with bcrypt; signed JWTs protect the user-management API.

## 1. What talks to what?

```text
Browser (React at http://localhost:5173)
  └── JSON over HTTP, with a Bearer token after login
      └── Express API (http://localhost:5000/api)
          └── mysql2 connection pool
              └── MySQL database (user_management)
```

The browser never connects directly to MySQL. The API validates requests, checks the JWT, hashes passwords, and runs parameterized SQL queries. Password hashes are never sent back by the API.

The Customers, Sellers, and Riders pages show database records in searchable rows. Admins can add directory entries, open a person's full directory profile, approve or reject pending seller/rider applications, and suspend approved sellers/riders with a required, saved reason. Customer access can be approved or suspended. Customer, seller, and rider profiles support profile pictures; seller profiles also support license and rating information and a shop photo. Image uploads are limited to 750 KB each and stored in MySQL. The admin overview shows live directory totals, sample recent orders, and a recent-activity feed saved in the current browser. Its daily/weekly/monthly/yearly sales, revenue, and profit figures are illustrative; live orders and financial totals require an orders and payments source. Sellers/Riders page visibility switches remain browser-local and are not server-side access controls.

## 2. Project layout

```text
backend/
  .env.example
  package.json
  sql/schema.sql
  src/
    app.js                 Express middleware and routes
    server.js              Environment checks and HTTP server startup
    config/db.js           MySQL connection pool
    middleware/auth.js     JWT verification and administrator check
    routes/auth.js         Registration, login, and current-user routes
    routes/users.js        Administrator-only user CRUD routes
frontend/
  index.html
  package.json
  vite.config.js
  src/
    main.jsx               React entry point
    App.jsx                Login, registration, dashboard, and CRUD UI
    api.js                 Shared fetch helper
    styles.css             Responsive application styles
postman/
  user-management.postman_collection.json
```

## 3. Requirements

- Node.js 20 or newer and npm
- MySQL Community Server 8.0.46 (or a compatible MySQL 8.0 server)
- VS Code (recommended)
- Postman (optional; the included collection can also be imported)

## 4. Set up MySQL

1. Start the MySQL server and open MySQL Workbench or a MySQL command-line client.
2. Run `backend/sql/schema.sql`. It creates the `user_management` database, the `users` table, and three repeatable sample records. The schema script uses a bcrypt hash for the documented sample admin password.
3. After the seller, rider, and customer tables are set up, run `backend/sql/directory_profiles_migration.sql` once to add approval, rating, and image fields (including customer profile pictures) required by the updated API.
4. Run `backend/sql/seller_rider_suspension_migration.sql` once to add the suspended approval state and saved suspension reasons for sellers and riders.
5. Keep the database user/password private; do not put real credentials in source control.

The sample accounts are:

| Email | Password | Access |
|---|---|---|
| `admin@example.com` | `Admin123!` | Administrator dashboard and user CRUD |
| `jane@example.com` | `User123!` | Regular account |
| `john@example.com` | `User123!` | Regular account |

Change these example passwords before using this project outside local development.

## 5. Configure and run the backend

Open a terminal in the project root:

```powershell
cd backend
Copy-Item .env.example .env
```

Edit `backend/.env` and set `DB_USER` and `DB_PASSWORD` to a MySQL account that can access the database. Set `JWT_SECRET` to a long, random private value. The example values are for local learning only.

Install dependencies and start the API:

```powershell
npm install
npm run dev
```

The server listens on `http://localhost:5000`. Check `http://localhost:5000/api/health` for a status response. The first request that uses MySQL will also reveal connection/configuration errors in the backend terminal.

## 6. Run the frontend

Open a second terminal at the project root:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). Sign in as `admin@example.com` with `Admin123!` to use the dashboard. Public registration is disabled, and only administrator accounts can sign in. Administrators can still create and manage team-member records from the dashboard.

## 7. Learn the API routes

All request and response bodies use JSON. The collection in `postman/user-management.postman_collection.json` includes example requests for each route.

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | Public | API health check |
| `POST` | `/api/auth/login` | Public (administrator accounts only) | Verify credentials and receive a JWT |
| `GET` | `/api/auth/me` | Administrator | Get the signed-in administrator |
| `GET` | `/api/users` | Administrator | List users (never includes password hashes) |
| `GET` | `/api/users/:id` | Administrator | View one user |
| `POST` | `/api/users` | Administrator | Create a user |
| `PUT` | `/api/users/:id` | Administrator | Update name, email, role, or password |
| `DELETE` | `/api/users/:id` | Administrator | Delete a user |
| `GET` / `POST` | `/api/sellers` | Administrator | List or add sellers |
| `PUT` | `/api/sellers/:id` | Administrator | Update seller profile or approval |
| `GET` / `POST` | `/api/riders` | Administrator | List or add riders |
| `PUT` | `/api/riders/:id` | Administrator | Update rider profile or approval |
| `GET` / `POST` | `/api/customers` | Administrator | List or add customers |
| `PUT` | `/api/customers/:id` | Administrator | Approve or suspend a customer |

For protected routes, copy the `token` from the login response into the Postman collection's `token` collection variable. Postman then sends `Authorization: Bearer <token>`. To create a user as an administrator, send:

```json
{
  "name": "Sam Example",
  "email": "sam@example.com",
  "password": "Example123!",
  "role": "user"
}
```

To update, send any fields to change, for example `{"name":"Sam Updated"}`. Password updates require a new password of at least eight characters. A `401` means the token is missing/expired/invalid; a `403` means a regular user tried to use an administrator route; a `409` means the email is already registered. Validation and server errors are returned as JSON, e.g. `{"error":"Email is already registered."}`.

## 8. How to test

1. Run the SQL script, start MySQL, and check the API health route.
2. Sign in through the UI as the sample admin. Create, view, edit, and delete a test account; verify the total changes.
3. Use the admin dashboard to create a team-member record and verify it appears in the directory. Team-member accounts cannot sign in.
4. Import the Postman collection, log in, set its `token` collection variable, then try the user CRUD requests.
5. Try creating an account with a malformed email or duplicate email to see validation errors.

The API uses MySQL unique constraints as the final guard against duplicate emails. Request bodies are validated in the API as well as in the UI; UI checks are for convenience, not security.

## 9. Important implementation notes

- `backend/src/server.js` checks required environment variables before listening, then tests the database connection.
- `backend/src/app.js` configures JSON parsing, CORS, routes, not-found responses, and a centralized error handler.
- `backend/src/config/db.js` creates a reusable `mysql2/promise` pool. Queries use placeholders rather than concatenating user input into SQL.
- `backend/src/routes/auth.js` verifies login credentials, compares password hashes, and signs a time-limited JWT.
- `backend/src/middleware/auth.js` verifies Bearer tokens and separates authenticated users from administrators.
- `backend/src/routes/users.js` implements CRUD. Its shared field selection omits `password_hash`; provided passwords are re-hashed before storage.
- `backend/src/routes/sellers.js` and `backend/src/routes/riders.js` implement admin-only directory CRUD, approval status, ratings, license numbers, and uploaded image fields.
- `frontend/src/api.js` adds the JSON and authorization headers and converts API errors into messages for the UI.
- `frontend/src/App.jsx` provides administrator login, directory management, user details, and seller/rider/customer creation forms.
- `backend/sql/schema.sql` is safe to re-run for creating the database/table. Its sample inserts do nothing when the sample emails already exist.

## 10. Troubleshooting

- **MySQL connection refused:** Start the MySQL service and verify `DB_HOST` and `DB_PORT` in `backend/.env`.
- **Access denied:** Verify the `.env` user/password and that the MySQL user has privileges on `user_management`.
- **Unknown database/table:** Run `backend/sql/schema.sql` against the same MySQL server configured in `.env`.
- **Browser CORS error:** The API allows both `http://localhost:5173` and `http://127.0.0.1:5173` for local development. For another frontend origin, set `CLIENT_URL` in `backend/.env` and restart the API.
- **JWT secret missing:** Set `JWT_SECRET` in `backend/.env` and restart the backend.
- **Port already in use:** Stop the other local service using that port or change `PORT` in `backend/.env` (and `VITE_API_URL` in the frontend environment if the API port changes).

This is a local learning project, not a production-ready identity system. For production, add HTTPS, stronger operational secret management, rate limiting, audit logs, and a carefully reviewed account recovery/authorization policy.
