import dotenv from "dotenv";
dotenv.config();

const BASE_URL = `http://localhost:${process.env.PORT || 5000}/api`;

const randomSuffix = Math.floor(1000 + Math.random() * 9000);
const randomTimestamp = Date.now();

function logBox(title, status, data) {
  console.log(`\n======================================================`);
  console.log(`▶ ${title}`);
  console.log(`HTTP Status: ${status}`);
  console.log(JSON.stringify(data, null, 2));
}

async function api(path, options = {}) {
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
  } catch (err) {
    data = { error: "Failed to parse JSON" };
  }
  return { status: res.status, data };
}

async function main() {
  console.log("======================================================");
  console.log("  FIXMATE LIVE API TEST WITH RANDOM DB DATA");
  console.log(`  Target: ${BASE_URL}`);
  console.log("======================================================");

  // 1. Health Check
  const health = await api("/health");
  logBox("1. Health Check (GET /api/health)", health.status, health.data);

  // 2. Register a new Customer with random data
  const customerEmail = `customer_${randomSuffix}_${randomTimestamp}@fixmate.test`;
  const customerName = `Customer Alex ${randomSuffix}`;
  const regCustomer = await api("/auth/register", {
    method: "POST",
    body: {
      name: customerName,
      email: customerEmail,
      password: "password123",
      role: "customer",
      phone: `+1-555-01${randomSuffix.toString().slice(0, 2)}`,
    },
  });
  logBox("2. Register Customer (POST /api/auth/register)", regCustomer.status, regCustomer.data);
  const customerToken = regCustomer.data?.data?.token;
  const customerId = regCustomer.data?.data?.user?._id;

  // 3. Register a new Provider with random data
  const providerEmail = `provider_${randomSuffix}_${randomTimestamp}@fixmate.test`;
  const providerName = `Pro Services ${randomSuffix}`;
  const regProvider = await api("/auth/register", {
    method: "POST",
    body: {
      name: providerName,
      email: providerEmail,
      password: "password123",
      role: "provider",
      phone: `+1-555-02${randomSuffix.toString().slice(0, 2)}`,
    },
  });
  logBox("3. Register Provider (POST /api/auth/register)", regProvider.status, regProvider.data);
  const providerToken = regProvider.data?.data?.token;
  const providerId = regProvider.data?.data?.user?._id;

  // 4. Provider sets working availability
  const setAvailability = await api("/provider/availability", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${providerToken}` },
    body: {
      isAvailable: true,
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      startTime: "08:00",
      endTime: "19:00",
    },
  });
  logBox("4. Set Provider Availability (PATCH /api/provider/availability)", setAvailability.status, setAvailability.data);

  // 5. Provider creates a new Service with random pricing
  const randomPrice = Math.floor(40 + Math.random() * 80);
  const categories = ["Plumbing", "Electrical", "Carpentry", "AC Repair", "Cleaning"];
  const selectedCategory = categories[Math.floor(Math.random() * categories.length)];
  const createService = await api("/services", {
    method: "POST",
    headers: { Authorization: `Bearer ${providerToken}` },
    body: {
      name: `${selectedCategory} FastFix #${randomSuffix}`,
      description: `Complete diagnostic and on-site ${selectedCategory.toLowerCase()} repair service.`,
      category: selectedCategory,
      price: randomPrice,
      duration: 60,
    },
  });
  logBox("5. Provider Creates Service (POST /api/services)", createService.status, createService.data);
  const serviceId = createService.data?.data?.service?._id;

  // 6. Public Service Discovery (Search & Filter)
  const getServices = await api(`/services?search=${encodeURIComponent(selectedCategory)}&limit=3`);
  logBox(`6. Public Catalog Search: ${selectedCategory} (GET /api/services)`, getServices.status, getServices.data);

  // 7. Customer books the newly created service
  // Find a valid upcoming date (e.g., next Tuesday)
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + ((2 + 7 - targetDate.getDay()) % 7 || 7));
  const bookingDateStr = targetDate.toISOString().slice(0, 10);

  const createBooking = await api("/bookings", {
    method: "POST",
    headers: { Authorization: `Bearer ${customerToken}` },
    body: {
      serviceId,
      bookingDate: bookingDateStr,
      bookingTime: "11:00",
      address: `${randomSuffix} Elm Street, Suite 4B`,
      notes: "Please ring the doorbell upon arrival.",
    },
  });
  logBox("7. Customer Creates Booking (POST /api/bookings)", createBooking.status, createBooking.data);
  const bookingId = createBooking.data?.data?.booking?._id;

  // 8. Provider Views Assigned Bookings
  const providerBookings = await api("/bookings", {
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  logBox("8. Provider Views Bookings (GET /api/bookings)", providerBookings.status, providerBookings.data);

  // 9. Provider Advances Booking Lifecycle: PENDING -> ACCEPTED -> IN_PROGRESS -> COMPLETED
  const acceptBooking = await api(`/bookings/${bookingId}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${providerToken}` },
    body: { status: "ACCEPTED" },
  });
  console.log(`\n▶ 9a. Booking status advanced to ACCEPTED: status ${acceptBooking.status}`);

  const startBooking = await api(`/bookings/${bookingId}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${providerToken}` },
    body: { status: "IN_PROGRESS" },
  });
  console.log(`▶ 9b. Booking status advanced to IN_PROGRESS: status ${startBooking.status}`);

  const completeBooking = await api(`/bookings/${bookingId}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${providerToken}` },
    body: { status: "COMPLETED" },
  });
  logBox("9c. Provider Completes Booking (PATCH /api/bookings/:id/status)", completeBooking.status, completeBooking.data);

  // 10. Customer Submits Review for Completed Booking
  const randomRating = Math.floor(4 + Math.random() * 2); // 4 or 5
  const createReview = await api("/reviews", {
    method: "POST",
    headers: { Authorization: `Bearer ${customerToken}` },
    body: {
      bookingId,
      rating: randomRating,
      comment: `Outstanding job on the ${selectedCategory.toLowerCase()}! Solved within an hour. Highly recommended!`,
    },
  });
  logBox("10. Customer Submits Review (POST /api/reviews)", createReview.status, createReview.data);

  // 11. View Provider Public Profile to see updated Rating & Total Reviews
  const getProvider = await api(`/providers/${providerId}`);
  logBox("11. Provider Profile Updated Rating (GET /api/providers/:id)", getProvider.status, getProvider.data);

  // 12. Negative Security Test: Customer attempts to access Admin endpoint -> 403 Forbidden
  const forbiddenTest = await api("/admin/users", {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  logBox("12. Security Test: Customer hitting Admin API (GET /api/admin/users)", forbiddenTest.status, forbiddenTest.data);

  console.log("\n======================================================");
  console.log("  ALL LIVE API TESTS COMPLETED & STORED IN MONGODB!");
  console.log("======================================================\n");
}

main().catch((err) => {
  console.error("Live test failed:", err);
  process.exit(1);
});
