import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import speakeasy from "speakeasy";
import express from "express";
import { createApp } from "../src/app.js";
import User from "../src/models/User.model.js";
import authenticate from "../src/middleware/authenticate.js";
import authorize from "../src/middleware/authorize.js";

// ── Setup ───────────────────────────────────────────────────
let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Set env vars for JWT
  process.env.JWT_SECRET = "test-access-secret";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
  process.env.NODE_ENV = "test";

  // Build the app and add a test-only protected route for authorize tests
  // This must be added BEFORE the notFound/errorHandler middleware.
  app = buildTestApp();
});

/**
 * Build app with a test-only admin route injected before error handlers.
 */
function buildTestApp() {
  const testApp = createApp();

  // In Express 5, we can insert a route by re-using the router stack.
  // But the simplest approach: create a wrapper app that has the test route
  // mounted before delegating to the main app.
  const wrapper = express();
  wrapper.use(express.json());

  // Test-only admin route
  wrapper.get(
    "/api/test/admin-only",
    authenticate,
    authorize(["Admin"]),
    (_req, res) => {
      res.json({ success: true, message: "Admin access granted" });
    }
  );

  // Delegate everything else to the main app
  wrapper.use(testApp);

  return wrapper;
}

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/auth/register
// ═══════════════════════════════════════════════════════════════
describe("POST /api/auth/register", () => {
  it("should register a new user and return MFA setup data", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Test User",
      email: "test@example.com",
      password: "Password123!",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.name).toBe("Test User");
    expect(res.body.user.email).toBe("test@example.com");
    expect(res.body.user.role).toBe("Viewer");
    expect(res.body.user.mfaEnabled).toBe(false);

    // MFA setup should be returned
    expect(res.body.mfa).toBeDefined();
    expect(res.body.mfa.secret).toBeDefined();
    expect(res.body.mfa.otpAuthUrl).toBeDefined();

    // passwordHash must NOT be in the response
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it("should hash the password (not store plaintext)", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Hash Check",
      email: "hash@example.com",
      password: "Password123!",
    });

    const user = await User.findOne({ email: "hash@example.com" }).select(
      "+passwordHash"
    );
    expect(user).toBeDefined();
    expect(user.passwordHash).not.toBe("Password123!");
    expect(user.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt prefix
  });

  it("should accept a custom role on registration", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Manager User",
      email: "manager@example.com",
      password: "Password123!",
      role: "Manager",
    });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("Manager");
  });

  it("should reject duplicate email", async () => {
    const payload = {
      name: "Dup User",
      email: "dup@example.com",
      password: "Password123!",
    };

    await request(app).post("/api/auth/register").send(payload);
    const res = await request(app).post("/api/auth/register").send(payload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("should reject missing fields", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "incomplete@example.com",
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should reject password shorter than 8 characters", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Short PW",
      email: "short@example.com",
      password: "123",
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/at least 8/i);
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /api/auth/login
// ═══════════════════════════════════════════════════════════════
describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/api/auth/register").send({
      name: "Login User",
      email: "login@example.com",
      password: "Password123!",
    });
  });

  it("should login and return both access and refresh tokens (MFA disabled)", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "login@example.com",
      password: "Password123!",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe("login@example.com");

    // Should set cookies
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    const cookieStr = Array.isArray(cookies) ? cookies.join("; ") : cookies;
    expect(cookieStr).toMatch(/accessToken/);
    expect(cookieStr).toMatch(/refreshToken/);
  });

  it("should reject invalid password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "login@example.com",
      password: "WrongPassword!",
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  it("should reject non-existent email", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "nonexistent@example.com",
      password: "Password123!",
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should reject missing fields", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "login@example.com",
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/provide email and password/i);
  });

  it("should return mfaRequired when MFA is enabled", async () => {
    // Enable MFA for the user via direct DB update (avoids re-hashing password)
    await User.findOneAndUpdate(
      { email: "login@example.com" },
      { mfaEnabled: true }
    );

    const res = await request(app).post("/api/auth/login").send({
      email: "login@example.com",
      password: "Password123!",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.mfaRequired).toBe(true);
    // Should NOT issue tokens yet
    expect(res.body.accessToken).toBeUndefined();
    expect(res.body.refreshToken).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /api/auth/verify-mfa
// ═══════════════════════════════════════════════════════════════
describe("POST /api/auth/verify-mfa", () => {
  let mfaSecret;

  beforeEach(async () => {
    const regRes = await request(app).post("/api/auth/register").send({
      name: "MFA User",
      email: "mfa@example.com",
      password: "Password123!",
    });
    mfaSecret = regRes.body.mfa.secret;
  });

  it("should verify a valid TOTP and enable MFA on first verification", async () => {
    const validTotp = speakeasy.totp({
      secret: mfaSecret,
      encoding: "base32",
    });

    const res = await request(app).post("/api/auth/verify-mfa").send({
      email: "mfa@example.com",
      totp: validTotp,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();

    // Verify MFA is now enabled in the database
    const user = await User.findOne({ email: "mfa@example.com" });
    expect(user.mfaEnabled).toBe(true);
  });

  it("should reject an invalid TOTP code", async () => {
    const res = await request(app).post("/api/auth/verify-mfa").send({
      email: "mfa@example.com",
      totp: "000000",
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid or expired/i);
  });

  it("should reject missing fields", async () => {
    const res = await request(app).post("/api/auth/verify-mfa").send({
      email: "mfa@example.com",
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should reject non-existent email", async () => {
    const res = await request(app).post("/api/auth/verify-mfa").send({
      email: "ghost@example.com",
      totp: "123456",
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should work for full MFA login flow (login → mfaRequired → verify-mfa)", async () => {
    // 1. Enable MFA first by verifying TOTP
    const setupTotp = speakeasy.totp({
      secret: mfaSecret,
      encoding: "base32",
    });
    await request(app).post("/api/auth/verify-mfa").send({
      email: "mfa@example.com",
      totp: setupTotp,
    });

    // 2. Login — should get mfaRequired
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "mfa@example.com",
      password: "Password123!",
    });
    expect(loginRes.body.mfaRequired).toBe(true);

    // 3. Verify MFA to complete login
    const loginTotp = speakeasy.totp({
      secret: mfaSecret,
      encoding: "base32",
    });
    const verifyRes = await request(app).post("/api/auth/verify-mfa").send({
      email: "mfa@example.com",
      totp: loginTotp,
    });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.accessToken).toBeDefined();
    expect(verifyRes.body.refreshToken).toBeDefined();
    expect(verifyRes.body.user.email).toBe("mfa@example.com");
  });
});

// ═══════════════════════════════════════════════════════════════
// Authenticate middleware (via GET /api/auth/me)
// ═══════════════════════════════════════════════════════════════
describe("GET /api/auth/me (authenticate middleware)", () => {
  it("should return user data with a valid access token", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Me User",
      email: "me@example.com",
      password: "Password123!",
    });
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "me@example.com",
      password: "Password123!",
    });
    const { accessToken } = loginRes.body;

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe("me@example.com");
  });

  it("should reject request with no token", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/no token/i);
  });

  it("should reject request with an invalid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalidtoken123");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid/i);
  });
});

// ═══════════════════════════════════════════════════════════════
// Authorize middleware (role-based access via test route)
// ═══════════════════════════════════════════════════════════════
describe("Authorize middleware (role-based access)", () => {
  it("should block a Viewer from Admin-only resources", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Viewer User",
      email: "viewer@example.com",
      password: "Password123!",
    });
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "viewer@example.com",
      password: "Password123!",
    });
    const { accessToken } = loginRes.body;

    const res = await request(app)
      .get("/api/test/admin-only")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not authorized/i);
  });

  it("should allow an Admin to access Admin-only resources", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Admin User",
      email: "admin@example.com",
      password: "Password123!",
      role: "Admin",
    });
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: "Password123!",
    });
    const { accessToken } = loginRes.body;

    const res = await request(app)
      .get("/api/test/admin-only")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Admin access granted");
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /api/auth/logout
// ═══════════════════════════════════════════════════════════════
describe("POST /api/auth/logout", () => {
  it("should clear token cookies on logout", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Logout User",
      email: "logout@example.com",
      password: "Password123!",
    });
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "logout@example.com",
      password: "Password123!",
    });
    const { accessToken } = loginRes.body;

    const res = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/logged out/i);

    // Cookies should be cleared
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    const cookieStr = Array.isArray(cookies) ? cookies.join("; ") : cookies;
    expect(cookieStr).toMatch(/accessToken=none/i);
    expect(cookieStr).toMatch(/refreshToken=none/i);
  });
});
