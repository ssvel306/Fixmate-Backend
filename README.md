# FixMate Backend

A REST API backend for **FixMate**, a local service booking platform — customers find and book local service providers (plumbing, electrical, AC repair, cleaning, painting, appliance repair, etc.), providers manage their services and bookings, and admins oversee the platform.

Built as a portfolio project to demonstrate backend fundamentals: REST API design, authentication, role-based authorization, MongoDB/Mongoose data modeling, validation, and centralized error handling. Designed to be consumed by a Flutter mobile app.

> This is a learning/portfolio project, not a production deployment. See [Security notes](#security-notes) below for what that does and doesn't cover.

---

## Features

- **Authentication** — JWT-based register/login, bcrypt password hashing
- **Three roles** — Customer, Provider, Admin, each with its own permissions
- **Services** — providers create/manage services; customers search, filter, and paginate
- **Provider availability** — working days, hours, open/closed status
- **Bookings** — a controlled status workflow (`PENDING → ACCEPTED → IN_PROGRESS → COMPLETED`, plus `CANCELLED`/`REJECTED`) with invalid transitions blocked
- **Reviews & ratings** — one review per completed booking, provider average rating
- **Admin tools** — manage users/providers/services/bookings, deactivate accounts, moderate reviews
- **Validation** — `express-validator` on every input-taking route
- **Centralized error handling** — consistent JSON responses for every error type
- **Security basics** — rate limiting on auth routes, `helmet`, configurable CORS, env validation at startup

## Tech stack

Node.js · Express.js · MongoDB · Mongoose · JWT · bcryptjs · express-validator · helmet · express-rate-limit · dotenv · cors

---

## Architecture

```
Request → Route → [validators → validate middleware] → [protect / authorize middleware] → Controller → Model → MongoDB
                                                                                                ↓
                                                                                    Response (or thrown error → errorHandler)
```

- **routes/** define URLs and which middleware/controller handles them
- **validators/** declarative input-shape rules (express-validator)
- **middleware/** auth, role checks, validation runner, rate limiting, centralized error handler
- **controllers/** request handling + business logic (ownership checks, status workflow rules)
- **models/** Mongoose schemas
- **utils/** small reusable helpers (pagination, ObjectId checks, token generation, status-transition rules)

## Folder structure

```
fixmate-backend/
├── src/
│   ├── config/
│   │   ├── db.js                  # MongoDB connection
│   │   └── validateEnv.js         # startup env-var validation
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── serviceController.js
│   │   ├── providerController.js
│   │   ├── bookingController.js
│   │   ├── reviewController.js
│   │   └── adminController.js
│   ├── middleware/
│   │   ├── authMiddleware.js      # JWT verification (protect)
│   │   ├── roleMiddleware.js      # role checks (authorize)
│   │   ├── validate.js            # express-validator error formatting
│   │   ├── rateLimiter.js         # auth route rate limiting
│   │   └── errorHandler.js        # centralized error responses
│   ├── models/
│   │   ├── User.js                # includes provider availability sub-schema
│   │   ├── Service.js
│   │   ├── Booking.js
│   │   └── Review.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── providerRoutes.js      # /api/provider — logged-in provider self-service
│   │   ├── publicProviderRoutes.js # /api/providers — public profile + reviews
│   │   ├── serviceRoutes.js
│   │   ├── bookingRoutes.js
│   │   ├── reviewRoutes.js
│   │   └── adminRoutes.js
│   ├── utils/
│   │   ├── asyncHandler.js
│   │   ├── isValidObjectId.js
│   │   ├── generateToken.js
│   │   ├── pagination.js
│   │   ├── bookingStatus.js       # status transition rules
│   │   ├── availabilityValidators.js
│   │   └── calculateAverageRating.js
│   ├── validators/                # one file per resource, express-validator rule chains
│   └── app.js                     # Express app (middleware + routes)
├── scripts/
│   └── createAdmin.mjs            # one-off script to seed an admin account
├── postman/
│   ├── FixMate.postman_collection.json
│   ├── FixMate.postman_environment.json
│   └── generate-collection.mjs
├── server.js                      # entry point
├── .env.example
├── .gitignore
└── package.json
```

---

## Installation

```bash
git clone <your-repo-url>
cd fixmate-backend
npm install
cp .env.example .env
```

## Environment setup

Edit `.env`:

```env
PORT=5000
NODE_ENV=development

MONGO_URI=mongodb://127.0.0.1:27017/fixmate
JWT_SECRET=replace_this_with_a_long_random_string
JWT_EXPIRES_IN=7d

CORS_ORIGIN=
```

The server validates these at startup and refuses to boot with a missing `JWT_SECRET`, a missing `MONGO_URI`, or the placeholder secret still in place — so a misconfigured `.env` fails immediately with a clear message instead of failing mysteriously on the first request.

## MongoDB setup

Either works:
- **Local**: install MongoDB Community Edition, run `mongod`, use `MONGO_URI=mongodb://127.0.0.1:27017/fixmate`
- **Atlas** (free tier): create a cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas), get your connection string, use it as `MONGO_URI`

## Run commands

```bash
npm run dev     # development, auto-restarts on file changes
npm start       # production-style start
```

Verify it's running:
```bash
curl http://localhost:5000/api/health
```

### Creating an admin account

There's no public "register as admin" endpoint on purpose — admins are seeded directly:
```bash
node scripts/createAdmin.mjs "Admin Name" admin@example.com somePassword123
```
Then log in normally via `POST /api/auth/login`.

---

## Authentication

JWT-based. Register or log in to get a token, then send it on every protected request:
```
Authorization: Bearer <token>
```
Tokens are signed with `JWT_SECRET` and expire after `JWT_EXPIRES_IN` (default 7 days). Passwords are hashed with bcrypt and never returned in any API response.

## API documentation

All responses follow one shape:
```json
// success
{ "success": true, "message": "...", "data": { } }
// error
{ "success": false, "message": "...", "errors": [] }
```

### Auth (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/register` | Public | Register as customer or provider |
| POST | `/login` | Public | Log in, get a JWT |
| GET | `/me` | Authenticated | Get your own profile |

### Services (`/api/services`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Public | List services — `?search=&category=&minPrice=&maxPrice=&page=&limit=` |
| GET | `/:id` | Public | Get one service |
| POST | `/` | Provider | Create a service |
| PUT | `/:id` | Provider (owner) | Update your own service |
| DELETE | `/:id` | Provider (owner) | Delete your own service |

### Provider (`/api/provider`, `/api/providers`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/provider/availability` | Provider | Get your own availability |
| PATCH | `/provider/availability` | Provider | Update your own availability |
| GET | `/providers/:id` | Public | View a provider's public profile |
| GET | `/providers/:providerId/reviews` | Public | View a provider's reviews + average rating |

### Bookings (`/api/bookings`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Customer | Create a booking |
| GET | `/` | Authenticated | List bookings (role-filtered: own bookings, or all for admin) |
| GET | `/:id` | Owner or admin | Get one booking |
| PATCH | `/:id/status` | Provider (assigned) | Move booking through the workflow |
| PATCH | `/:id/cancel` | Customer (owner) | Cancel while `PENDING`/`ACCEPTED` |

### Reviews (`/api/reviews`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Customer | Review a completed booking (once) |
| DELETE | `/:id` | Customer (author) | Delete your own review |

### Admin (`/api/admin`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/users` | Admin | List customers |
| GET | `/providers` | Admin | List providers |
| GET | `/services` | Admin | List all services (incl. inactive) |
| GET | `/bookings` | Admin | List all bookings |
| PATCH | `/users/:id/status` | Admin | Activate/deactivate a user |
| DELETE | `/reviews/:id` | Admin | Remove any review (moderation) |

### Example: create a booking
```http
POST /api/bookings
Authorization: Bearer <customerToken>
Content-Type: application/json

{
  "serviceId": "665f1a...",
  "bookingDate": "2027-01-15",
  "bookingTime": "10:00",
  "address": "123 Main Street",
  "notes": "Please call before arriving"
}
```
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": { "booking": { "status": "PENDING", "price": 60, "...": "..." } }
}
```

---

## Postman testing

A full Postman collection is included: `postman/FixMate.postman_collection.json` + `postman/FixMate.postman_environment.json`. Import both, select the environment, and run the folders in order. Full details and a plain-text version of every test case: **[POSTMAN_TESTING.md](./POSTMAN_TESTING.md)**.

---

## Security notes

Implemented: password hashing, JWT auth, role + ownership checks, input validation, rate limiting on auth routes, security headers (`helmet`), configurable CORS, startup env validation, no sensitive data in API responses.

**Not covered** (out of scope for a portfolio project): HTTPS termination (handled by your host/reverse proxy), refresh-token rotation, account lockout beyond rate limiting, request logging/monitoring, automated tests/CI. This project should not be treated as production-hardened as-is.

## Future improvements

- Automated test suite (Jest/Supertest) instead of manual Postman testing
- Refresh tokens + token revocation
- Image upload for service photos and profile pictures (currently just URL strings)
- Real-time booking status updates (WebSockets/Socket.io)
- Payment integration
- Admin ability to create/manage service categories


## Database collections
FixMate uses separate authentication collections as requested:
- `customers`
- `providers`
- `admins`
- `services`
- `bookings`
- `reviews`

This intentionally extends the PRD's shared `users` collection design so Customer, Provider, and Admin accounts are physically separated while preserving the PRD role permissions and API behavior.

## Registration endpoints
- `POST /api/auth/customer/register`
- `POST /api/auth/provider/register`
- `POST /api/auth/admin/register` — requires `x-admin-registration-key`
- `POST /api/auth/login` — login searches all three account collections

## Important MVP safeguards
- Provider weekly availability is checked when a booking is created.
- Booking time conflicts are checked against active bookings, including service duration.
- Service price is snapshotted from the database; clients cannot set their own booking price.
- Reviews require a completed booking and are limited to one per booking.
- Provider `averageRating` and `totalReviews` are recalculated after review create/delete.
- Provider/admin/customer authorization is enforced from the JWT role and the corresponding collection.

Provider approval, provider skills, provider location, payment status, chat, maps, and similar items are not added because the supplied PRD places those outside the MVP or future scope.