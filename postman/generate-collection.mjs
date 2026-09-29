// Generates postman/FixMate.postman_collection.json
// Run with: node postman/generate-collection.mjs
import fs from "fs";

let itemIdCounter = 1;
const nextId = () => `item-${itemIdCounter++}`;

// req() builds one Postman request item.
// testScript: array of JS lines injected as a "test" event script.
// preScript: array of JS lines injected as a "prerequest" event script.
function req({ name, method, path, headers = [], body, testScript = [], preScript = [] }) {
  const item = {
    name,
    id: nextId(),
    request: {
      method,
      header: headers.map((h) => ({ key: h.key, value: h.value, type: "text" })),
      url: {
        raw: `{{baseUrl}}${path}`,
        host: ["{{baseUrl}}"],
        path: path.replace(/^\//, "").split("/"),
      },
    },
    response: [],
  };

  if (body) {
    item.request.body = { mode: "raw", raw: JSON.stringify(body, null, 2), options: { raw: { language: "json" } } };
  }

  const events = [];
  if (preScript.length) {
    events.push({ listen: "prerequest", script: { type: "text/javascript", exec: ["{", ...preScript, "}"] } });
  }
  if (testScript.length) {
    // Wrapped in { ... } so `const`/`let` declarations (e.g. `const data = ...`)
    // in one request's test script can't collide with the same names in another
    // request's test script if they end up sharing an execution scope.
    events.push({ listen: "test", script: { type: "text/javascript", exec: ["{", ...testScript, "}"] } });
  }
  if (events.length) item.event = events;

  return item;
}

const authHeader = (tokenVar) => [{ key: "Authorization", value: `Bearer {{${tokenVar}}}` }];
const jsonHeader = () => [{ key: "Content-Type", value: "application/json" }];

const statusTest = (label, code) => [
  `pm.test("${label} -> status ${code}", function () {`,
  `    pm.response.to.have.status(${code});`,
  `});`,
];

// ---------------------------------------------------------------------
// 1. AUTH
// ---------------------------------------------------------------------
const authFolder = {
  name: "1. Auth",
  item: [
    req({
      name: "Register Customer",
      method: "POST",
      path: "/auth/register",
      headers: jsonHeader(),
      preScript: [`pm.environment.set("customerEmail", "customer_" + Date.now() + "@fixmate.test");`],
      body: { name: "Test Customer", email: "{{customerEmail}}", password: "password123", role: "customer" },
      testScript: [
        ...statusTest("Register customer", 201),
        `const data = pm.response.json();`,
        `pm.test("Response has token and user", function () {`,
        `    pm.expect(data.data.token).to.be.a("string");`,
        `    pm.expect(data.data.user.role).to.eql("customer");`,
        `});`,
        `pm.environment.set("customerToken", data.data.token);`,
        `pm.environment.set("customerId", data.data.user._id);`,
      ],
    }),
    req({
      name: "Register Provider",
      method: "POST",
      path: "/auth/register",
      headers: jsonHeader(),
      preScript: [`pm.environment.set("providerEmail", "provider_" + Date.now() + "@fixmate.test");`],
      body: { name: "Test Provider", email: "{{providerEmail}}", password: "password123", role: "provider" },
      testScript: [
        ...statusTest("Register provider", 201),
        `const data = pm.response.json();`,
        `pm.environment.set("providerToken", data.data.token);`,
        `pm.environment.set("providerId", data.data.user._id);`,
      ],
    }),
    req({
      name: "Login Customer",
      method: "POST",
      path: "/auth/login",
      headers: jsonHeader(),
      body: { email: "{{customerEmail}}", password: "password123" },
      testScript: [
        ...statusTest("Login customer", 200),
        `const data = pm.response.json();`,
        `pm.environment.set("customerToken", data.data.token);`,
      ],
    }),
    req({
      name: "Login Provider",
      method: "POST",
      path: "/auth/login",
      headers: jsonHeader(),
      body: { email: "{{providerEmail}}", password: "password123" },
      testScript: [
        ...statusTest("Login provider", 200),
        `const data = pm.response.json();`,
        `pm.environment.set("providerToken", data.data.token);`,
      ],
    }),
    req({
      name: "Login Admin (run scripts/createAdmin.mjs first)",
      method: "POST",
      path: "/auth/login",
      headers: jsonHeader(),
      body: { email: "{{adminEmail}}", password: "{{adminPassword}}" },
      testScript: [
        ...statusTest("Login admin", 200),
        `const data = pm.response.json();`,
        `pm.environment.set("adminToken", data.data.token);`,
      ],
    }),
    req({
      name: "Get Me (Customer)",
      method: "GET",
      path: "/auth/me",
      headers: authHeader("customerToken"),
      testScript: statusTest("Get profile", 200),
    }),
  ],
};

// ---------------------------------------------------------------------
// 2. PROVIDER AVAILABILITY
// ---------------------------------------------------------------------
const providerFolder = {
  name: "2. Provider Availability",
  item: [
    req({
      name: "Update My Availability",
      method: "PATCH",
      path: "/provider/availability",
      headers: [...authHeader("providerToken"), ...jsonHeader()],
      body: { isAvailable: true, workingDays: ["Monday", "Wednesday", "Friday"], startTime: "09:00", endTime: "17:00" },
      testScript: statusTest("Update availability", 200),
    }),
    req({
      name: "Get My Availability",
      method: "GET",
      path: "/provider/availability",
      headers: authHeader("providerToken"),
      testScript: statusTest("Get availability", 200),
    }),
    req({
      name: "Get Public Provider Profile",
      method: "GET",
      path: "/providers/{{providerId}}",
      testScript: statusTest("Get provider profile", 200),
    }),
  ],
};

// ---------------------------------------------------------------------
// 3. SERVICES
// ---------------------------------------------------------------------
const servicesFolder = {
  name: "3. Services",
  item: [
    req({
      name: "Create Service (Provider)",
      method: "POST",
      path: "/services",
      headers: [...authHeader("providerToken"), ...jsonHeader()],
      body: {
        title: "AC Repair & Maintenance",
        description: "Full AC unit inspection, cleaning, and repair.",
        category: "AC Repair",
        price: 60,
        duration: 90,
      },
      testScript: [
        ...statusTest("Create service", 201),
        `const data = pm.response.json();`,
        `pm.environment.set("serviceId", data.data.service._id);`,
      ],
    }),
    req({
      name: "Get Services (list)",
      method: "GET",
      path: "/services?page=1&limit=10",
      testScript: statusTest("List services", 200),
    }),
    req({
      name: "Search/Filter Services",
      method: "GET",
      path: "/services?search=AC&category=AC Repair&minPrice=10&maxPrice=200",
      testScript: statusTest("Search/filter services", 200),
    }),
    req({
      name: "Get Service By Id",
      method: "GET",
      path: "/services/{{serviceId}}",
      testScript: statusTest("Get service by id", 200),
    }),
    req({
      name: "Update Service (Owner)",
      method: "PUT",
      path: "/services/{{serviceId}}",
      headers: [...authHeader("providerToken"), ...jsonHeader()],
      body: { price: 65 },
      testScript: statusTest("Update own service", 200),
    }),
  ],
};

// ---------------------------------------------------------------------
// 4. BOOKINGS
// ---------------------------------------------------------------------
const bookingsFolder = {
  name: "4. Bookings",
  item: [
    req({
      name: "Create Booking (Customer)",
      method: "POST",
      path: "/bookings",
      headers: [...authHeader("customerToken"), ...jsonHeader()],
      body: {
        serviceId: "{{serviceId}}",
        bookingDate: "2027-01-15",
        bookingTime: "10:00",
        address: "123 Main Street, Springfield",
        notes: "Please call before arriving.",
      },
      testScript: [
        ...statusTest("Create booking", 201),
        `const data = pm.response.json();`,
        `pm.environment.set("bookingId", data.data.booking._id);`,
      ],
    }),
    req({
      name: "Get Bookings (Customer view)",
      method: "GET",
      path: "/bookings",
      headers: authHeader("customerToken"),
      testScript: statusTest("Customer views own bookings", 200),
    }),
    req({
      name: "Get Bookings (Provider view)",
      method: "GET",
      path: "/bookings",
      headers: authHeader("providerToken"),
      testScript: statusTest("Provider views assigned bookings", 200),
    }),
    req({
      name: "Get Booking By Id",
      method: "GET",
      path: "/bookings/{{bookingId}}",
      headers: authHeader("customerToken"),
      testScript: statusTest("Get booking by id", 200),
    }),
    req({
      name: "Provider Accepts Booking",
      method: "PATCH",
      path: "/bookings/{{bookingId}}/status",
      headers: [...authHeader("providerToken"), ...jsonHeader()],
      body: { status: "ACCEPTED" },
      testScript: statusTest("Accept booking", 200),
    }),
    req({
      name: "Provider Starts Booking (IN_PROGRESS)",
      method: "PATCH",
      path: "/bookings/{{bookingId}}/status",
      headers: [...authHeader("providerToken"), ...jsonHeader()],
      body: { status: "IN_PROGRESS" },
      testScript: statusTest("Start booking", 200),
    }),
    req({
      name: "Provider Completes Booking",
      method: "PATCH",
      path: "/bookings/{{bookingId}}/status",
      headers: [...authHeader("providerToken"), ...jsonHeader()],
      body: { status: "COMPLETED" },
      testScript: statusTest("Complete booking", 200),
    }),
  ],
};

// ---------------------------------------------------------------------
// 5. REVIEWS
// ---------------------------------------------------------------------
const reviewsFolder = {
  name: "5. Reviews",
  item: [
    req({
      name: "Submit Review (Customer, on COMPLETED booking)",
      method: "POST",
      path: "/reviews",
      headers: [...authHeader("customerToken"), ...jsonHeader()],
      body: { bookingId: "{{bookingId}}", rating: 5, comment: "Great service, very professional!" },
      testScript: [
        ...statusTest("Submit review", 201),
        `const data = pm.response.json();`,
        `pm.environment.set("reviewId", data.data.review._id);`,
      ],
    }),
    req({
      name: "Get Provider Reviews (+ average rating)",
      method: "GET",
      path: "/providers/{{providerId}}/reviews",
      testScript: statusTest("Get provider reviews", 200),
    }),
  ],
};

// ---------------------------------------------------------------------
// 6. ADMIN
// ---------------------------------------------------------------------
const adminFolder = {
  name: "6. Admin",
  item: [
    req({ name: "Admin Dashboard", method: "GET", path: "/admin/dashboard", headers: authHeader("adminToken"), testScript: statusTest("Admin dashboard", 200) }),
    req({ name: "Get All Users", method: "GET", path: "/admin/users", headers: authHeader("adminToken"), testScript: statusTest("Get users", 200) }),
    req({ name: "Get All Providers", method: "GET", path: "/admin/providers", headers: authHeader("adminToken"), testScript: statusTest("Get providers", 200) }),
    req({ name: "Get All Services (incl. inactive)", method: "GET", path: "/admin/services", headers: authHeader("adminToken"), testScript: statusTest("Get all services", 200) }),
    req({ name: "Get All Bookings", method: "GET", path: "/admin/bookings", headers: authHeader("adminToken"), testScript: statusTest("Get all bookings", 200) }),
    req({
      name: "Deactivate a User",
      method: "PATCH",
      path: "/admin/users/{{customerId}}/status",
      headers: [...authHeader("adminToken"), ...jsonHeader()],
      body: { isActive: false },
      testScript: statusTest("Deactivate user", 200),
    }),
    req({
      name: "Reactivate the User",
      method: "PATCH",
      path: "/admin/users/{{customerId}}/status",
      headers: [...authHeader("adminToken"), ...jsonHeader()],
      body: { isActive: true },
      testScript: statusTest("Reactivate user", 200),
    }),
    req({
      name: "Delete Review (Admin moderation)",
      method: "DELETE",
      path: "/admin/reviews/{{reviewId}}",
      headers: authHeader("adminToken"),
      testScript: statusTest("Admin deletes review", 200),
    }),
  ],
};

// ---------------------------------------------------------------------
// 7. UNAUTHORIZED ACCESS TESTS
// ---------------------------------------------------------------------
const unauthorizedFolder = {
  name: "7. Unauthorized Access Tests",
  item: [
    req({ name: "No token on protected route -> 401", method: "GET", path: "/auth/me", testScript: statusTest("No token", 401) }),
    req({ name: "Customer hits admin-only route -> 403", method: "GET", path: "/admin/users", headers: authHeader("customerToken"), testScript: statusTest("Customer blocked from admin", 403) }),
    req({ name: "Customer hits provider-only route -> 403", method: "GET", path: "/provider/dashboard", headers: authHeader("customerToken"), testScript: statusTest("Customer blocked from provider route", 403) }),
    req({
      name: "Customer tries to create a service -> 403",
      method: "POST",
      path: "/services",
      headers: [...authHeader("customerToken"), ...jsonHeader()],
      body: { title: "x", description: "x", category: "x", price: 1, duration: 1 },
      testScript: statusTest("Customer blocked from creating service", 403),
    }),
    req({ name: "Invalid/garbage token -> 401", method: "GET", path: "/auth/me", headers: [{ key: "Authorization", value: "Bearer not.a.real.token" }], testScript: statusTest("Garbage token", 401) }),
  ],
};

// ---------------------------------------------------------------------
// 8. INVALID INPUT TESTS
// ---------------------------------------------------------------------
const invalidFolder = {
  name: "8. Invalid Input Tests",
  item: [
    req({
      name: "Register with bad email -> 400",
      method: "POST",
      path: "/auth/register",
      headers: jsonHeader(),
      body: { name: "Bad Email", email: "not-an-email", password: "password123" },
      testScript: statusTest("Bad email rejected", 400),
    }),
    req({
      name: "Register with short password -> 400",
      method: "POST",
      path: "/auth/register",
      headers: jsonHeader(),
      body: { name: "Short Pw", email: "shortpw_{{$timestamp}}@fixmate.test", password: "123" },
      testScript: statusTest("Short password rejected", 400),
    }),
    req({
      name: "Create service with negative price -> 400",
      method: "POST",
      path: "/services",
      headers: [...authHeader("providerToken"), ...jsonHeader()],
      body: { title: "Bad Service", description: "desc", category: "cat", price: -10, duration: 30 },
      testScript: statusTest("Negative price rejected", 400),
    }),
    req({
      name: "Create booking with invalid date -> 400",
      method: "POST",
      path: "/bookings",
      headers: [...authHeader("customerToken"), ...jsonHeader()],
      body: { serviceId: "{{serviceId}}", bookingDate: "not-a-date", bookingTime: "10:00", address: "123 St" },
      testScript: statusTest("Invalid date rejected", 400),
    }),
    req({
      name: "Invalid ObjectId in URL -> 400",
      method: "GET",
      path: "/services/not-a-valid-id",
      testScript: statusTest("Invalid ObjectId rejected", 400),
    }),
    req({
      name: "Invalid status transition (PENDING -> COMPLETED) -> 400",
      method: "PATCH",
      path: "/bookings/{{bookingId}}/status",
      headers: [...authHeader("providerToken"), ...jsonHeader()],
      body: { status: "COMPLETED" },
      testScript: [
        `pm.test("Rejects illegal transition (booking is already COMPLETED from folder 4, so this correctly 400s either way)", function () {`,
        `    pm.expect(pm.response.code).to.eql(400);`,
        `});`,
      ],
    }),
    req({
      name: "Duplicate review on same booking -> 409",
      method: "POST",
      path: "/reviews",
      headers: [...authHeader("customerToken"), ...jsonHeader()],
      preScript: [
        `pm.sendRequest({`,
        `    url: pm.environment.get("baseUrl") + "/reviews",`,
        `    method: "POST",`,
        `    header: { "Content-Type": "application/json", "Authorization": "Bearer " + pm.environment.get("customerToken") },`,
        `    body: { mode: "raw", raw: JSON.stringify({ bookingId: pm.environment.get("bookingId"), rating: 5 }) }`,
        `}, function (err, res) {});`,
      ],
      body: { bookingId: "{{bookingId}}", rating: 4 },
      testScript: statusTest("Duplicate review rejected", 409),
    }),

  ],
};

const collection = {
  info: {
    name: "FixMate Backend API",
    description:
      "Full Postman test suite for the FixMate local service booking platform backend. " +
      "Run folders 1-6 in order first (they set up data used later), then 7-8 for negative tests. " +
      "Import FixMate.postman_environment.json alongside this collection and select it as the active environment. " +
      "Before running folder 6 (Admin), create an admin account with: node scripts/createAdmin.mjs \"Admin\" admin@fixmate.test changeThisPassword123 " +
      "(matching the adminEmail/adminPassword environment variables).",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  item: [authFolder, providerFolder, servicesFolder, bookingsFolder, reviewsFolder, adminFolder, unauthorizedFolder, invalidFolder],
};

fs.writeFileSync(new URL("./FixMate.postman_collection.json", import.meta.url), JSON.stringify(collection, null, 2));
console.log("Collection written to postman/FixMate.postman_collection.json");
