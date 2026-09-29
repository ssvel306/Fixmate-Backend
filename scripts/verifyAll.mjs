import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import http from "http";
import app from "../src/app.js";
import connectDB from "../src/config/db.js";
import Customer from "../src/models/Customer.js";
import Provider from "../src/models/Provider.js";
import Admin from "../src/models/Admin.js";
import Service from "../src/models/Service.js";
import Booking from "../src/models/Booking.js";
import Review from "../src/models/Review.js";

const PORT = 5055;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

let passed = 0;
let failed = 0;
const results = [];

function record(name, isPass, detail = "") {
  if (isPass) {
    passed++;
    results.push({ name, status: "PASS", detail });
    console.log(`[PASS] ${name}${detail ? ` - ${detail}` : ""}`);
  } else {
    failed++;
    results.push({ name, status: "FAIL", detail });
    console.error(`[FAIL] ${name}${detail ? ` - ${detail}` : ""}`);
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const body = options.body ? JSON.stringify(options.body) : undefined;
  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, data };
}

async function run() {
  console.log("=== FIXMATE BACKEND FULL TEST SUITE ===");
  process.env.NODE_ENV = "test";

  // 1. Database Connection & Schema Verification
  await connectDB();
  const db = mongoose.connection.db;

  const collections = (await db.listCollections().toArray()).map((c) => c.name);
  console.log("Existing collections in DB:", collections);

  // Check required account collections
  const hasCustomers = Customer.collection.name === "customers";
  const hasProviders = Provider.collection.name === "providers";
  const hasAdmins = Admin.collection.name === "admins";
  const hasServices = Service.collection.name === "services";
  const hasBookings = Booking.collection.name === "bookings";
  const hasReviews = Review.collection.name === "reviews";

  record("Database Collection: customers", hasCustomers);
  record("Database Collection: providers", hasProviders);
  record("Database Collection: admins", hasAdmins);
  record("Database Collection: services", hasServices);
  record("Database Collection: bookings", hasBookings);
  record("Database Collection: reviews", hasReviews);

  // Start HTTP Server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Test server running at ${BASE_URL}`);

  try {
    // 2. Health Check
    const health = await request("/health");
    record("Health Check GET /api/health", health.status === 200 && health.data?.success === true && !!health.data?.data?.timestamp);

    // 3. Authentication & Account Tests
    const ts = Date.now();
    const custEmail = `cust_${ts}@test.com`;
    const custEmail2 = `cust2_${ts}@test.com`;
    const provEmail = `prov_${ts}@test.com`;
    const provEmail2 = `prov2_${ts}@test.com`;
    const adminEmail = `admin_${ts}@test.com`;

    // Customer Registration
    const regCust = await request("/auth/register", {
      method: "POST",
      body: { name: "Alice Customer", email: custEmail, password: "password123", role: "customer" },
    });
    record("Customer Registration (POST /api/auth/register)", regCust.status === 201 && regCust.data?.data?.user?.role === "customer");
    const custToken = regCust.data?.data?.token;
    const custId = regCust.data?.data?.user?._id;

    // Customer 2 Registration
    const regCust2 = await request("/auth/customer/register", {
      method: "POST",
      body: { name: "Bob Customer", email: custEmail2, password: "password123" },
    });
    record("Customer Registration dedicated (POST /api/auth/customer/register)", regCust2.status === 201);
    const cust2Token = regCust2.data?.data?.token;
    const cust2Id = regCust2.data?.data?.user?._id;

    // Provider Registration
    const regProv = await request("/auth/register", {
      method: "POST",
      body: { name: "Charlie Provider", email: provEmail, password: "password123", role: "provider" },
    });
    record("Provider Registration (POST /api/auth/register)", regProv.status === 201 && regProv.data?.data?.user?.role === "provider");
    const provToken = regProv.data?.data?.token;
    const provId = regProv.data?.data?.user?._id;

    // Provider 2 Registration
    const regProv2 = await request("/auth/provider/register", {
      method: "POST",
      body: { name: "Dave Provider", email: provEmail2, password: "password123" },
    });
    record("Provider Registration dedicated (POST /api/auth/provider/register)", regProv2.status === 201);
    const prov2Token = regProv2.data?.data?.token;
    const prov2Id = regProv2.data?.data?.user?._id;

    // Duplicate email registration rejected with 409
    const dupReg = await request("/auth/register", {
      method: "POST",
      body: { name: "Dup User", email: custEmail, password: "password123", role: "customer" },
    });
    record("Duplicate email registration rejected (409 Conflict)", dupReg.status === 409 && dupReg.data?.success === false);

    // Validation failures
    const badEmail = await request("/auth/register", {
      method: "POST",
      body: { name: "Bad Email", email: "not-an-email", password: "password123" },
    });
    record("Registration with invalid email rejected (400)", badEmail.status === 400 && badEmail.data?.success === false);

    const shortPw = await request("/auth/register", {
      method: "POST",
      body: { name: "Short Pw", email: `short_${ts}@test.com`, password: "123" },
    });
    record("Registration with short password rejected (400)", shortPw.status === 400 && shortPw.data?.success === false);

    // Admin registration endpoint with/without key
    const adminNoKey = await request("/auth/admin/register", {
      method: "POST",
      body: { name: "Admin No Key", email: adminEmail, password: "password123" },
    });
    record("Admin registration without secret key blocked (403)", adminNoKey.status === 403);

    const adminWithKey = await request("/auth/admin/register", {
      method: "POST",
      headers: { "x-admin-registration-key": process.env.ADMIN_REGISTRATION_KEY || "adminsecretkey2026" },
      body: { name: "Super Admin", email: adminEmail, password: "password123" },
    });
    record("Admin registration with secret key (201)", adminWithKey.status === 201 && adminWithKey.data?.data?.user?.role === "admin");
    const adminToken = adminWithKey.data?.data?.token;
    const adminId = adminWithKey.data?.data?.user?._id;

    // Login tests
    const loginCust = await request("/auth/login", {
      method: "POST",
      body: { email: custEmail, password: "password123" },
    });
    record("Customer Login (POST /api/auth/login)", loginCust.status === 200 && !loginCust.data?.data?.user?.password);

    const loginProv = await request("/auth/login", {
      method: "POST",
      body: { email: provEmail, password: "password123" },
    });
    record("Provider Login (POST /api/auth/login)", loginProv.status === 200 && !loginProv.data?.data?.user?.password);

    const loginAdmin = await request("/auth/login", {
      method: "POST",
      body: { email: adminEmail, password: "password123" },
    });
    record("Admin Login (POST /api/auth/login)", loginAdmin.status === 200 && !loginAdmin.data?.data?.user?.password);

    const badLogin = await request("/auth/login", {
      method: "POST",
      body: { email: custEmail, password: "wrongpassword" },
    });
    record("Login with incorrect password rejected (401)", badLogin.status === 401 && badLogin.data?.success === false);

    // Profile GET /api/auth/me
    const getMe = await request("/auth/me", { headers: { Authorization: `Bearer ${custToken}` } });
    record("Profile GET /api/auth/me (authenticated)", getMe.status === 200 && getMe.data?.data?.user?.email === custEmail);

    const noToken = await request("/auth/me");
    record("Missing token rejected (401)", noToken.status === 401);

    const garbageToken = await request("/auth/me", { headers: { Authorization: "Bearer bad.token.here" } });
    record("Invalid token rejected (401)", garbageToken.status === 401);

    // 4. Role-based Authorization checks
    const custToProvider = await request("/provider/dashboard", { headers: { Authorization: `Bearer ${custToken}` } });
    record("Customer blocked from provider route (403)", custToProvider.status === 403);

    const custToAdmin = await request("/admin/users", { headers: { Authorization: `Bearer ${custToken}` } });
    record("Customer blocked from admin route (403)", custToAdmin.status === 403);

    const provToAdmin = await request("/admin/users", { headers: { Authorization: `Bearer ${provToken}` } });
    record("Provider blocked from admin route (403)", provToAdmin.status === 403);

    // 5. Provider Availability & Profile
    const updateAvail = await request("/provider/availability", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${provToken}` },
      body: {
        isAvailable: true,
        workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        startTime: "09:00",
        endTime: "18:00",
      },
    });
    record("Provider updates availability (PATCH /api/provider/availability)", updateAvail.status === 200 && updateAvail.data?.data?.availability?.startTime === "09:00");

    const getAvail = await request("/provider/availability", { headers: { Authorization: `Bearer ${provToken}` } });
    record("Provider gets own availability (GET /api/provider/availability)", getAvail.status === 200 && getAvail.data?.data?.availability?.workingDays?.length === 5);

    const updateProfile = await request("/provider/profile", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${provToken}` },
      body: { phone: "+1234567890", name: "Charlie Pro" },
    });
    record("Provider updates profile (PATCH /api/provider/profile)", updateProfile.status === 200 && updateProfile.data?.data?.provider?.phone === "+1234567890");

    const publicProfile = await request(`/providers/${provId}`);
    record("Public gets provider profile (GET /api/providers/:id)", publicProfile.status === 200 && publicProfile.data?.data?.provider?.name === "Charlie Pro");

    const badProvId = await request("/providers/invalid_object_id");
    record("Invalid provider id rejected (400)", badProvId.status === 400);

    // 6. Services Management
    // Customer cannot create service
    const custCreateSvc = await request("/services", {
      method: "POST",
      headers: { Authorization: `Bearer ${custToken}` },
      body: { name: "Plumbing", description: "Fix pipes", category: "Plumbing", price: 50, duration: 60 },
    });
    record("Customer blocked from creating service (403)", custCreateSvc.status === 403);

    // Provider creates service 1
    const createSvc1 = await request("/services", {
      method: "POST",
      headers: { Authorization: `Bearer ${provToken}` },
      body: { name: "Pipe Leak Repair", description: "Fix leaking pipes in kitchen/bathroom", category: "Plumbing", price: 80, duration: 60 },
    });
    record("Provider creates Service 1 (POST /api/services)", createSvc1.status === 201 && createSvc1.data?.data?.service?.name === "Pipe Leak Repair");
    const svc1Id = createSvc1.data?.data?.service?._id;

    // Provider creates service 2
    const createSvc2 = await request("/services", {
      method: "POST",
      headers: { Authorization: `Bearer ${provToken}` },
      body: { name: "AC Filter Cleaning", description: "Air conditioner full clean", category: "HVAC", price: 120, duration: 90 },
    });
    record("Provider creates Service 2 (POST /api/services)", createSvc2.status === 201);
    const svc2Id = createSvc2.data?.data?.service?._id;

    // Provider 2 creates service 3
    const createSvc3 = await request("/services", {
      method: "POST",
      headers: { Authorization: `Bearer ${prov2Token}` },
      body: { name: "Electrical Wiring", description: "Home electrical repair", category: "Electrical", price: 100, duration: 60 },
    });
    record("Provider 2 creates Service 3 (POST /api/services)", createSvc3.status === 201);
    const svc3Id = createSvc3.data?.data?.service?._id;

    // Provider gets own services
    const getMySvc = await request("/provider/services", { headers: { Authorization: `Bearer ${provToken}` } });
    record("Provider views own services (GET /api/provider/services)", getMySvc.status === 200 && getMySvc.data?.data?.services?.length >= 2);

    // Provider 1 tries to update Provider 2's service (403)
    const prov1UpdateProv2 = await request(`/services/${svc3Id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${provToken}` },
      body: { price: 200 },
    });
    record("Provider cannot update another provider's service (403)", prov1UpdateProv2.status === 403);

    // Provider 1 updates own service 1
    const prov1UpdateOwn = await request(`/services/${svc1Id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${provToken}` },
      body: { price: 85 },
    });
    record("Provider updates own service (PUT /api/services/:id)", prov1UpdateOwn.status === 200 && prov1UpdateOwn.data?.data?.service?.price === 85);

    // Public lists services
    const listSvc = await request("/services");
    record("Public lists services (GET /api/services)", listSvc.status === 200 && listSvc.data?.data?.services?.length >= 3);

    // Category filter
    const filterCat = await request("/services?category=Plumbing");
    record("Filter services by category", filterCat.status === 200 && filterCat.data?.data?.services?.every((s) => s.category.toLowerCase() === "plumbing"));

    // Price filter
    const filterPrice = await request("/services?minPrice=80&maxPrice=100");
    record("Filter services by price", filterPrice.status === 200 && filterPrice.data?.data?.services?.every((s) => s.price >= 80 && s.price <= 100));

    // Search filter
    const searchSvc = await request("/services?search=Pipe");
    record("Search services by name/description", searchSvc.status === 200 && searchSvc.data?.data?.services?.length >= 1);

    // Pagination
    const pageSvc = await request("/services?page=1&limit=2");
    record("Paginated service listing", pageSvc.status === 200 && pageSvc.data?.data?.services?.length === 2 && pageSvc.data?.data?.pagination?.totalPages >= 2);

    // Get single service by id
    const getSvc1 = await request(`/services/${svc1Id}`);
    record("Public gets single service (GET /api/services/:id)", getSvc1.status === 200 && getSvc1.data?.data?.service?.name === "Pipe Leak Repair");

    // Invalid service id
    const badSvcId = await request("/services/invalid_id");
    record("Invalid service id rejected (400)", badSvcId.status === 400);

    // Provider 2 deactivates Service 3
    const deactSvc3 = await request(`/services/${svc3Id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${prov2Token}` },
    });
    record("Provider deactivates service (DELETE /api/services/:id)", deactSvc3.status === 200);

    // Deactivated service is not returned in public listing
    const listAfterDeact = await request("/services");
    const containsDeactivated = listAfterDeact.data?.data?.services?.some((s) => s._id === svc3Id);
    record("Deactivated service excluded from public discovery", !containsDeactivated);

    // 7. Booking System & Conflict Checking
    // Helper to find next valid day (e.g. next Monday)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + ((1 + 7 - targetDate.getDay()) % 7 || 7)); // Next Monday
    const nextMondayStr = targetDate.toISOString().slice(0, 10);

    // Find a Sunday date (provider workingDays are Mon-Fri)
    const sundayDate = new Date();
    sundayDate.setDate(sundayDate.getDate() + ((0 + 7 - sundayDate.getDay()) % 7 || 7));
    const sundayStr = sundayDate.toISOString().slice(0, 10);

    // Booking on non-working day (Sunday) fails (400)
    const bookSunday = await request("/bookings", {
      method: "POST",
      headers: { Authorization: `Bearer ${custToken}` },
      body: { serviceId: svc1Id, bookingDate: sundayStr, bookingTime: "10:00", address: "123 Main St" },
    });
    record("Booking on non-working day rejected (400)", bookSunday.status === 400);

    // Booking outside working hours (05:00, provider is 09:00-18:00) fails (400)
    const bookEarly = await request("/bookings", {
      method: "POST",
      headers: { Authorization: `Bearer ${custToken}` },
      body: { serviceId: svc1Id, bookingDate: nextMondayStr, bookingTime: "05:00", address: "123 Main St" },
    });
    record("Booking outside working hours rejected (400)", bookEarly.status === 400);

    // Valid booking 1 (Monday 10:00-11:00)
    const book1 = await request("/bookings", {
      method: "POST",
      headers: { Authorization: `Bearer ${custToken}` },
      body: { serviceId: svc1Id, bookingDate: nextMondayStr, bookingTime: "10:00", address: "123 Main St", notes: "Please arrive on time" },
    });
    record("Customer creates booking 1 (POST /api/bookings)", book1.status === 201 && book1.data?.data?.booking?.status === "PENDING" && book1.data?.data?.booking?.price === 85);
    const booking1Id = book1.data?.data?.booking?._id;

    // Conflicting booking at exact same time (Monday 10:00) fails (409)
    const conflictExact = await request("/bookings", {
      method: "POST",
      headers: { Authorization: `Bearer ${cust2Token}` },
      body: { serviceId: svc1Id, bookingDate: nextMondayStr, bookingTime: "10:00", address: "456 Oak St" },
    });
    record("Conflict Check: identical slot rejected (409 Conflict)", conflictExact.status === 409);

    // Conflicting booking with overlap (Monday 10:30-11:30 overlaps with 10:00-11:00) fails (409)
    const conflictOverlap = await request("/bookings", {
      method: "POST",
      headers: { Authorization: `Bearer ${cust2Token}` },
      body: { serviceId: svc1Id, bookingDate: nextMondayStr, bookingTime: "10:30", address: "456 Oak St" },
    });
    record("Conflict Check: overlapping slot rejected (409 Conflict)", conflictOverlap.status === 409);

    // Non-conflicting booking on same day (Monday 11:00, immediately after 10:00-11:00) succeeds (201)
    const book2 = await request("/bookings", {
      method: "POST",
      headers: { Authorization: `Bearer ${cust2Token}` },
      body: { serviceId: svc1Id, bookingDate: nextMondayStr, bookingTime: "11:00", address: "456 Oak St" },
    });
    record("Non-conflicting adjacent slot succeeds (POST /api/bookings)", book2.status === 201);
    const booking2Id = book2.data?.data?.booking?._id;

    // Booking 3 for testing cancellation
    const book3 = await request("/bookings", {
      method: "POST",
      headers: { Authorization: `Bearer ${custToken}` },
      body: { serviceId: svc1Id, bookingDate: nextMondayStr, bookingTime: "14:00", address: "789 Pine St" },
    });
    record("Customer creates booking 3 for cancellation test", book3.status === 201);
    const booking3Id = book3.data?.data?.booking?._id;

    // Booking 4 for testing provider rejection
    const book4 = await request("/bookings", {
      method: "POST",
      headers: { Authorization: `Bearer ${custToken}` },
      body: { serviceId: svc1Id, bookingDate: nextMondayStr, bookingTime: "16:00", address: "999 Cedar St" },
    });
    record("Customer creates booking 4 for rejection test", book4.status === 201);
    const booking4Id = book4.data?.data?.booking?._id;

    // Verify price snapshot: Update service price, ensure existing booking price is unchanged
    await request(`/services/${svc1Id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${provToken}` },
      body: { price: 150 },
    });
    const checkB1 = await request(`/bookings/${booking1Id}`, { headers: { Authorization: `Bearer ${custToken}` } });
    record("Booking price snapshot preserved when service price changes", checkB1.data?.data?.booking?.price === 85);

    // List bookings: Customer only sees customer bookings
    const custBookings = await request("/bookings", { headers: { Authorization: `Bearer ${custToken}` } });
    const custAllMatch = custBookings.data?.data?.bookings?.every((b) => b.customer?._id === custId || b.customer === custId);
    record("Customer GET /api/bookings lists only own bookings", custBookings.status === 200 && custAllMatch);

    // List bookings: Provider only sees provider bookings
    const provBookings = await request("/bookings", { headers: { Authorization: `Bearer ${provToken}` } });
    const provAllMatch = provBookings.data?.data?.bookings?.every((b) => b.provider?._id === provId || b.provider === provId);
    record("Provider GET /api/bookings lists only assigned bookings", provBookings.status === 200 && provAllMatch);

    // Ownership: Customer 2 tries to view Booking 1 (belongs to Customer 1) -> 403
    const cust2ViewCust1 = await request(`/bookings/${booking1Id}`, { headers: { Authorization: `Bearer ${cust2Token}` } });
    record("Customer cannot view another customer's booking (403)", cust2ViewCust1.status === 403);

    // Ownership: Provider 2 tries to advance Booking 1 (assigned to Provider 1) -> 403
    const prov2AdvanceB1 = await request(`/bookings/${booking1Id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${prov2Token}` },
      body: { status: "ACCEPTED" },
    });
    record("Provider cannot advance another provider's booking (403)", prov2AdvanceB1.status === 403);

    // Customer tries to advance status directly -> 403
    const custAdvanceB1 = await request(`/bookings/${booking1Id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${custToken}` },
      body: { status: "ACCEPTED" },
    });
    record("Customer blocked from PATCH /api/bookings/:id/status (403)", custAdvanceB1.status === 403);

    // Provider advances status: PENDING -> ACCEPTED
    const acceptB1 = await request(`/bookings/${booking1Id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${provToken}` },
      body: { status: "ACCEPTED" },
    });
    record("Provider accepts booking: PENDING -> ACCEPTED", acceptB1.status === 200 && acceptB1.data?.data?.booking?.status === "ACCEPTED");

    // Invalid transition: ACCEPTED -> PENDING (400)
    const badTrans1 = await request(`/bookings/${booking1Id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${provToken}` },
      body: { status: "PENDING" },
    });
    record("Invalid transition ACCEPTED -> PENDING rejected (400)", badTrans1.status === 400);

    // Provider advances status: ACCEPTED -> IN_PROGRESS
    const startB1 = await request(`/bookings/${booking1Id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${provToken}` },
      body: { status: "IN_PROGRESS" },
    });
    record("Provider starts booking: ACCEPTED -> IN_PROGRESS", startB1.status === 200 && startB1.data?.data?.booking?.status === "IN_PROGRESS");

    // Customer tries to cancel booking when IN_PROGRESS -> 400
    const cancelInProgress = await request(`/bookings/${booking1Id}/cancel`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${custToken}` },
      body: { reason: "Changed mind" },
    });
    record("Cancelling IN_PROGRESS booking rejected (400)", cancelInProgress.status === 400);

    // Provider advances status: IN_PROGRESS -> COMPLETED
    const completeB1 = await request(`/bookings/${booking1Id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${provToken}` },
      body: { status: "COMPLETED" },
    });
    record("Provider completes booking: IN_PROGRESS -> COMPLETED", completeB1.status === 200 && completeB1.data?.data?.booking?.status === "COMPLETED");

    // Invalid transition from COMPLETED -> ACCEPTED (400)
    const badTrans2 = await request(`/bookings/${booking1Id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${provToken}` },
      body: { status: "ACCEPTED" },
    });
    record("Invalid transition COMPLETED -> ACCEPTED rejected (400)", badTrans2.status === 400);

    // Test rejection flow on booking 4: PENDING -> REJECTED
    const rejectB4 = await request(`/bookings/${booking4Id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${provToken}` },
      body: { status: "REJECTED" },
    });
    record("Provider rejects booking: PENDING -> REJECTED", rejectB4.status === 200 && rejectB4.data?.data?.booking?.status === "REJECTED");

    // Test cancellation flow on booking 3: PENDING -> CANCELLED
    const cancelB3 = await request(`/bookings/${booking3Id}/cancel`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${custToken}` },
      body: { reason: "Customer schedule conflict" },
    });
    record("Customer cancels pending booking: PENDING -> CANCELLED", cancelB3.status === 200 && cancelB3.data?.data?.booking?.status === "CANCELLED");

    // Customer 2 cannot cancel Customer 1's booking -> 403
    const cust2CancelB3 = await request(`/bookings/${booking3Id}/cancel`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${cust2Token}` },
      body: { reason: "Intrusion" },
    });
    record("Customer cannot cancel another customer's booking (403)", cust2CancelB3.status === 403);

    // Complete Booking 2 for Customer 2 review test
    await request(`/bookings/${booking2Id}/status`, { method: "PATCH", headers: { Authorization: `Bearer ${provToken}` }, body: { status: "ACCEPTED" } });
    await request(`/bookings/${booking2Id}/status`, { method: "PATCH", headers: { Authorization: `Bearer ${provToken}` }, body: { status: "IN_PROGRESS" } });
    await request(`/bookings/${booking2Id}/status`, { method: "PATCH", headers: { Authorization: `Bearer ${provToken}` }, body: { status: "COMPLETED" } });

    // 8. Reviews & Ratings
    // Provider cannot submit a review -> 403
    const provReview = await request("/reviews", {
      method: "POST",
      headers: { Authorization: `Bearer ${provToken}` },
      body: { bookingId: booking1Id, rating: 5, comment: "I am great" },
    });
    record("Provider blocked from submitting review (403)", provReview.status === 403);

    // Customer 2 cannot review Customer 1's booking -> 403
    const cust2ReviewB1 = await request("/reviews", {
      method: "POST",
      headers: { Authorization: `Bearer ${cust2Token}` },
      body: { bookingId: booking1Id, rating: 5 },
    });
    record("Customer cannot review another customer's booking (403)", cust2ReviewB1.status === 403);

    // Customer cannot review non-completed booking (Booking 3 is CANCELLED) -> 400
    const reviewCancelled = await request("/reviews", {
      method: "POST",
      headers: { Authorization: `Bearer ${custToken}` },
      body: { bookingId: booking3Id, rating: 5 },
    });
    record("Reviewing non-completed booking rejected (400)", reviewCancelled.status === 400);

    // Invalid ratings: 0, 6, 2.5
    const r0 = await request("/reviews", { method: "POST", headers: { Authorization: `Bearer ${custToken}` }, body: { bookingId: booking1Id, rating: 0 } });
    const r6 = await request("/reviews", { method: "POST", headers: { Authorization: `Bearer ${custToken}` }, body: { bookingId: booking1Id, rating: 6 } });
    const rFloat = await request("/reviews", { method: "POST", headers: { Authorization: `Bearer ${custToken}` }, body: { bookingId: booking1Id, rating: 2.5 } });
    record("Invalid ratings (0, 6, float) rejected (400)", r0.status === 400 && r6.status === 400 && rFloat.status === 400);

    // Valid review 1 by Customer 1: rating 5
    const rev1 = await request("/reviews", {
      method: "POST",
      headers: { Authorization: `Bearer ${custToken}` },
      body: { bookingId: booking1Id, rating: 5, comment: "Excellent work on my pipes!" },
    });
    record("Customer submits valid review (POST /api/reviews)", rev1.status === 201 && rev1.data?.data?.review?.rating === 5);
    const review1Id = rev1.data?.data?.review?._id;

    // Check provider rating update: averageRating = 5, totalReviews = 1
    const provAfterRev1 = await request(`/providers/${provId}`);
    record("Provider rating updated to 5.0 (totalReviews: 1)", provAfterRev1.data?.data?.provider?.averageRating === 5 && provAfterRev1.data?.data?.provider?.totalReviews === 1);

    // Duplicate review on same booking fails (409)
    const dupReview = await request("/reviews", {
      method: "POST",
      headers: { Authorization: `Bearer ${custToken}` },
      body: { bookingId: booking1Id, rating: 4 },
    });
    record("Duplicate review on same booking rejected (409 Conflict)", dupReview.status === 409);

    // Valid review 2 by Customer 2 on Booking 2: rating 3
    const rev2 = await request("/reviews", {
      method: "POST",
      headers: { Authorization: `Bearer ${cust2Token}` },
      body: { bookingId: booking2Id, rating: 3, comment: "Good but a bit late" },
    });
    record("Customer 2 submits review (POST /api/reviews)", rev2.status === 201);
    const review2Id = rev2.data?.data?.review?._id;

    // Check provider rating update: averageRating = (5+3)/2 = 4.0, totalReviews = 2
    const provAfterRev2 = await request(`/providers/${provId}`);
    record("Provider rating updated to 4.0 (totalReviews: 2)", provAfterRev2.data?.data?.provider?.averageRating === 4 && provAfterRev2.data?.data?.provider?.totalReviews === 2);

    // Public gets provider reviews
    const provReviews = await request(`/providers/${provId}/reviews`);
    record("Public lists provider reviews (GET /api/providers/:id/reviews)", provReviews.status === 200 && provReviews.data?.data?.reviews?.length === 2);

    // Customer 1 deletes own review
    const delOwnRev = await request(`/reviews/${review1Id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${custToken}` },
    });
    record("Customer deletes own review (DELETE /api/reviews/:id)", delOwnRev.status === 200);

    // Check provider rating update: averageRating = 3.0, totalReviews = 1
    const provAfterDel = await request(`/providers/${provId}`);
    record("Provider rating recalculated after deletion: 3.0 (totalReviews: 1)", provAfterDel.data?.data?.provider?.averageRating === 3 && provAfterDel.data?.data?.provider?.totalReviews === 1);

    // Customer 1 cannot delete Customer 2's review -> 403
    const cust1DelCust2Rev = await request(`/reviews/${review2Id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${custToken}` },
    });
    record("Customer cannot delete another customer's review (403)", cust1DelCust2Rev.status === 403);

    // 9. Admin APIs
    // Admin dashboard
    const adminDash = await request("/admin/dashboard", { headers: { Authorization: `Bearer ${adminToken}` } });
    record("Admin GET /api/admin/dashboard", adminDash.status === 200 && adminDash.data?.data?.user?.role === "admin");

    // Admin lists all users
    const adminUsers = await request("/admin/users", { headers: { Authorization: `Bearer ${adminToken}` } });
    record("Admin GET /api/admin/users lists all users", adminUsers.status === 200 && adminUsers.data?.data?.users?.length >= 4);

    // Admin lists providers
    const adminProvs = await request("/admin/providers", { headers: { Authorization: `Bearer ${adminToken}` } });
    record("Admin GET /api/admin/providers lists providers", adminProvs.status === 200 && adminProvs.data?.data?.users?.length >= 2);

    // Admin lists all services (including deactivated)
    const adminSvcs = await request("/admin/services", { headers: { Authorization: `Bearer ${adminToken}` } });
    record("Admin GET /api/admin/services lists all services", adminSvcs.status === 200 && adminSvcs.data?.data?.services?.length >= 3);

    // Admin lists all bookings
    const adminBooks = await request("/admin/bookings", { headers: { Authorization: `Bearer ${adminToken}` } });
    record("Admin GET /api/admin/bookings lists platform bookings", adminBooks.status === 200 && adminBooks.data?.data?.bookings?.length >= 4);

    // Admin deactivates Customer 2
    const deactCust2 = await request(`/admin/users/${cust2Id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { isActive: false },
    });
    record("Admin deactivates user (PATCH /api/admin/users/:id/status)", deactCust2.status === 200 && deactCust2.data?.data?.user?.isActive === false);

    // Deactivated user cannot call authenticated routes -> 401
    const deactUserMe = await request("/auth/me", { headers: { Authorization: `Bearer ${cust2Token}` } });
    record("Deactivated user blocked from authenticated API (401)", deactUserMe.status === 401);

    // Deactivated user cannot login -> 403
    const deactUserLogin = await request("/auth/login", {
      method: "POST",
      body: { email: custEmail2, password: "password123" },
    });
    record("Deactivated user login rejected (403)", deactUserLogin.status === 403);

    // Admin reactivates Customer 2
    const reactCust2 = await request(`/admin/users/${cust2Id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { isActive: true },
    });
    record("Admin reactivates user (PATCH /api/admin/users/:id/status)", reactCust2.status === 200 && reactCust2.data?.data?.user?.isActive === true);

    // Reactivated user can now login
    const reactUserLogin = await request("/auth/login", {
      method: "POST",
      body: { email: custEmail2, password: "password123" },
    });
    record("Reactivated user login succeeds (200)", reactUserLogin.status === 200);

    // Admin deactivates service via PATCH /api/admin/services/:id/status
    const adminDeactSvc = await request(`/admin/services/${svc2Id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { isActive: false },
    });
    record("Admin updates service status (PATCH /api/admin/services/:id/status)", adminDeactSvc.status === 200 && adminDeactSvc.data?.data?.service?.isActive === false);

    // Admin deletes service via DELETE /api/services/:id
    const adminDelSvc = await request(`/services/${svc1Id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    record("Admin deactivates service via DELETE /api/services/:id", adminDelSvc.status === 200);

    // Admin deletes review via DELETE /api/admin/reviews/:id
    const adminDelRev = await request(`/admin/reviews/${review2Id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    record("Admin deletes review (DELETE /api/admin/reviews/:id)", adminDelRev.status === 200);

    // Provider rating after all reviews deleted: averageRating = 0, totalReviews = 0
    const provAfterAllDel = await request(`/providers/${provId}`);
    record("Provider rating reset to 0 after all reviews deleted", provAfterAllDel.data?.data?.provider?.averageRating === 0 && provAfterAllDel.data?.data?.provider?.totalReviews === 0);

    // 10. API Envelope & Security Format Verification
    const notFound = await request("/non-existent-route-xyz");
    record("404 Error envelope has standard structure", notFound.status === 404 && notFound.data?.success === false && Array.isArray(notFound.data?.errors));

  } finally {
    server.close();
    await mongoose.disconnect();
  }

  console.log("\n=========================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log("=========================================");
  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
