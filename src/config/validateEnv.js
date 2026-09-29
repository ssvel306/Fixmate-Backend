// validateEnv() checks required environment variables exist before the
// server starts.
// What: a startup guard.
// Why: without this, a missing JWT_SECRET wouldn't fail until the first
//      login attempt, with a confusing error deep in jsonwebtoken. Better
//      to fail immediately, at boot, with a clear message.
// Where: called once at the top of server.js, before connectDB().
const REQUIRED_ENV_VARS = ["PORT", "MONGO_URI", "JWT_SECRET"];

const validateEnv = () => {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`Missing required environment variable(s): ${missing.join(", ")}`);
    console.error("Copy .env.example to .env and fill in real values.");
    process.exit(1);
  }

  if (process.env.JWT_SECRET === "replace_this_with_a_long_random_string") {
    console.error("JWT_SECRET is still set to the .env.example placeholder — please set a real secret.");
    process.exit(1);
  }

  if (process.env.ADMIN_REGISTRATION_KEY === "replace_with_a_long_random_admin_setup_key") {
    console.warn("ADMIN_REGISTRATION_KEY is still the example value; replace it before using admin registration.");
  }
};

export default validateEnv;
