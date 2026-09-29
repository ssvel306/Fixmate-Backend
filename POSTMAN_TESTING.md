# FixMate API — Postman Testing Plan

Two ways to test this API in Postman:

1. **Import the ready-made collection** (recommended) — `postman/FixMate.postman_collection.json` + `postman/FixMate.postman_environment.json`. Import both, select "FixMate - Local" as the active environment, and run folders in order (or use "Run collection" for the whole thing). Tokens and IDs are captured automatically by test scripts as you go.
2. **Build requests by hand** using the reference tables below.

Before testing Admin endpoints, create an admin account (there's no public registration for admins — see Phase 8):
```bash
node scripts/createAdmin.mjs "Admin" admin@fixmate.test changeThisPassword123
```
(These match the `adminEmail` / `adminPassword` values already in the environment file — change both if you use different credentials.)

All requests use base URL `http://localhost:5000/api` (adjust the port if you changed `PORT` in `.env`).

---

## Test order

### 1. Customer registration
| | |
|---|---|
| Method | `POST` |
| URL | `/auth/register` |
| Headers | `Content-Type: application/json` |
| Body | `{ "name": "Jane Doe", "email": "jane@example.com", "password": "password123", "role": "customer" }` |
| Expected | `201`, `{ success: true, data: { token, user } }`, no `password` field in `user` |

### 2. Customer login
| | |
|---|---|
| Method | `POST` |
| URL | `/auth/login` |
| Body | `{ "email": "jane@example.com", "password": "password123" }` |
| Expected | `200`, token in `data.token` |

### 3. Provider registration
Same as #1 with `"role": "provider"`.

### 4. Provider login
Same as #2 with the provider's credentials.

### 5. Admin login
| | |
|---|---|
| Method | `POST` |
| URL | `/auth/login` |
| Body | `{ "email": "admin@fixmate.test", "password": "changeThisPassword123" }` |
| Expected | `200` — only works after running `createAdmin.mjs` |

### 6. Create service (Provider)
| | |
|---|---|
| Method | `POST` |
| URL | `/services` |
| Headers | `Authorization: Bearer <providerToken>`, `Content-Type: application/json` |
| Body | `{ "title": "AC Repair", "description": "Full inspection and repair", "category": "AC Repair", "price": 60, "duration": 90 }` |
| Expected | `201`, service returned with `provider` set to the logged-in provider |
| Error case | Same request with a customer token → `403` |

### 7. Get services / search / filter
| | |
|---|---|
| Method | `GET` |
| URL | `/services?search=AC&category=AC Repair&minPrice=10&maxPrice=200&page=1&limit=10` |
| Headers | none (public) |
| Expected | `200`, `data.services` array + `data.pagination` |

### 8. Create booking (Customer)
| | |
|---|---|
| Method | `POST` |
| URL | `/bookings` |
| Headers | `Authorization: Bearer <customerToken>`, `Content-Type: application/json` |
| Body | `{ "serviceId": "<serviceId>", "bookingDate": "2027-01-15", "bookingTime": "10:00", "address": "123 Main St" }` |
| Expected | `201`, `price` in the response matches the service's price (never taken from your request body) |

### 9. Provider views booking
| | |
|---|---|
| Method | `GET` |
| URL | `/bookings` |
| Headers | `Authorization: Bearer <providerToken>` |
| Expected | `200`, only bookings assigned to this provider |

### 10. Provider accepts booking
| | |
|---|---|
| Method | `PATCH` |
| URL | `/bookings/<bookingId>/status` |
| Headers | `Authorization: Bearer <providerToken>`, `Content-Type: application/json` |
| Body | `{ "status": "ACCEPTED" }` |
| Expected | `200` |

### 11. Provider starts booking
Same as #10 with `{ "status": "IN_PROGRESS" }`.

### 12. Provider completes booking
Same as #10 with `{ "status": "COMPLETED" }`.
| Error case | Try `{ "status": "PENDING" }` on a `COMPLETED` booking → `400` (illegal transition) |

### 13. Customer submits review
| | |
|---|---|
| Method | `POST` |
| URL | `/reviews` |
| Headers | `Authorization: Bearer <customerToken>`, `Content-Type: application/json` |
| Body | `{ "bookingId": "<bookingId>", "rating": 5, "comment": "Great service!" }` |
| Expected | `201` — only works if the booking is `COMPLETED` and belongs to this customer |
| Error case | Submit the same review again → `409` |

### 14. Admin views users/bookings/services
| Method | URL | Expected |
|---|---|---|
| `GET` | `/admin/users` | `200`, customers only |
| `GET` | `/admin/providers` | `200`, providers only |
| `GET` | `/admin/services` | `200`, **all** services including inactive ones |
| `GET` | `/admin/bookings` | `200`, every booking across every user |

All require `Authorization: Bearer <adminToken>`.

### 15. Unauthorized access tests
| Request | Expected |
|---|---|
| Any protected route, no token | `401` |
| Any protected route, garbage token | `401` |
| Customer → `GET /admin/users` | `403` |
| Customer → `GET /provider/dashboard` | `403` |
| Customer → `POST /services` | `403` |
| Provider A → `PUT /services/:id` on Provider B's service | `403` |

### 16. Invalid input tests
| Request | Expected |
|---|---|
| Register with a malformed email | `400`, `errors: [{field: "email", ...}]` |
| Register with a 3-character password | `400` |
| Create service with `price: -10` | `400` |
| Create booking with `bookingDate: "not-a-date"` | `400` |
| `GET /services/not-a-valid-id` | `400` (invalid ObjectId) |
| `PATCH /bookings/:id/status` with an illegal transition | `400` |
| Review the same booking twice | `409` |
| Register with an email already in use | `409` |

### 17. Rate limiting (Phase 10)
Send 21+ requests to `POST /api/auth/login` within 15 minutes from the same IP → the 21st gets `429 Too many attempts...`.

---

## Notes on the Postman collection

- **Folders 1–6** set up data used by later folders — run them once, in order, at the start of a session.
- **Folders 7–8** are negative tests and can be re-run independently at any time.
- Test scripts on each request automatically save `customerToken`, `providerToken`, `adminToken`, `serviceId`, `bookingId`, `reviewId`, etc. to the environment as you go — no manual copy-pasting between requests.
- Register requests generate a unique email each run (`customer_<timestamp>@fixmate.test`) so you can re-run the whole collection repeatedly without hitting duplicate-email `409`s.
- The collection was built with a small generator script (`postman/generate-collection.mjs`) rather than hand-written JSON, and was test-run with Newman (Postman's CLI runner) during development — that's how a real scope bug in the test scripts (a `const data` name collision across requests) got caught and fixed before this was handed to you.
