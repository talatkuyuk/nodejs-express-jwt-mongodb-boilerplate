const request = require("supertest");
const { status: httpStatus } = require("http-status");

const app = require("../../src/core/express");

const { authuserDbService } = require("../../src/services");

const TestUtil = require("../testutils/TestUtil");

const { setupTestDatabase } = require("../setup/setupTestDatabase");
const { setupRedis } = require("../setup/setupRedis");

setupTestDatabase();
setupRedis();

describe("POST /auth/unlink", () => {
  const userAgent = "from-jest-test";

  /** @type {string} */
  let accessToken;

  /** @type {string} */
  let authuserId;

  /** @type {string} */
  let authuserEmail;

  beforeEach(async () => {
    const { authuser, tokens } = await TestUtil.createAuthUser(userAgent, {
      email: "talat@google.com",
      password: "Pass1word!",
    });

    authuserId = authuser.id;
    authuserEmail = authuser.email;
    accessToken = tokens.access.token;
  });

  describe("Request Validation Errors for Unlink Auth Provider", () => {
    test("should return status 422, if the query param 'provider' is not provided", async () => {
      const response = await request(app)
        .post("/auth/unlink")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("User-Agent", userAgent)
        .send();

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors.provider).toEqual([
        "query param 'provider' is missing",
      ]);
      expect(response.body.error.errors).not.toHaveProperty("body");
    });

    test("should return status 422, if the query param 'provider' is other than an auth provider", async () => {
      const response = await request(app)
        .post("/auth/unlink?provider=anAuth")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("User-Agent", userAgent)
        .send();

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors.provider).toEqual([
        "The query param 'provider' should be an auth provider",
      ]);
      expect(response.body.error.errors).not.toHaveProperty("body");
    });
  });

  describe("Failed Unlink Auth Provider", () => {
    test("should return status 400, if the auth provider is already unlinked", async () => {
      // facebook is not in the authuser's provider !

      const response = await request(app)
        .post("/auth/unlink?provider=facebook") // facebook
        .set("Authorization", `Bearer ${accessToken}`)
        .set("User-Agent", userAgent)
        .send();

      TestUtil.errorExpectations(response, httpStatus.BAD_REQUEST);
      expect(response.body.error.name).toBe("ApiError");
      expect(response.body.error.message).toEqual("The auth provider is already unlinked");
    });

    test("should return status 400, if one auth provider is left", async () => {
      await authuserDbService.updateAuthUser(authuserId, {
        providers: { google: "google-id-for-the-authuser" },
      });

      const response = await request(app)
        .post("/auth/unlink?provider=google") // google
        .set("Authorization", `Bearer ${accessToken}`)
        .set("User-Agent", userAgent)
        .send();

      TestUtil.errorExpectations(response, httpStatus.BAD_REQUEST);
      expect(response.body.error.name).toBe("ApiError");
      expect(response.body.error.message).toEqual("There must be one auth provider at least");
    });
  });

  describe("Success Unlink Auth Provider", () => {
    test("should return status 200, and return authuser after the auth provider is unlinked (emailpassword)", async () => {
      await authuserDbService.updateAuthUser(authuserId, {
        providers: { emailpassword: true, google: "google-id-for-the-authuser" },
      });

      const response = await request(app)
        .post("/auth/unlink?provider=emailpassword") // emailpassword
        .set("Authorization", `Bearer ${accessToken}`)
        .set("User-Agent", userAgent)
        .send();

      expect(response.body).toEqual({
        success: true,
        data: {
          authuser: {
            id: authuserId,
            email: authuserEmail,
            isEmailVerified: false,
            isDisabled: false,
            createdAt: expect.any(Number), // 1631868212022
            updatedAt: expect.any(Number),
            providers: {
              // emailpassword is gone
              google: "google-id-for-the-authuser",
            },
          },
        },
      });

      // check the authuser's password turns to null
      const authuser = await authuserDbService.getAuthUser({ id: authuserId });

      if (!authuser) {
        throw new Error("Unexpected fail in db operation while getting an authuser");
      }

      expect(authuser.password).toBeNull();
    });

    test("should return status 200, and return authuser after the auth provider is unlinked (google)", async () => {
      await authuserDbService.updateAuthUser(authuserId, {
        providers: { emailpassword: true, google: "google-id-for-the-authuser" },
      });

      const response = await request(app)
        .post("/auth/unlink?provider=google") // google
        .set("Authorization", `Bearer ${accessToken}`)
        .set("User-Agent", userAgent)
        .send();

      expect(response.body).toEqual({
        success: true,
        data: {
          authuser: {
            id: authuserId,
            email: authuserEmail,
            isEmailVerified: false,
            isDisabled: false,
            createdAt: expect.any(Number), // 1631868212022
            updatedAt: expect.any(Number),
            providers: {
              // google is gone
              emailpassword: true,
            },
          },
        },
      });
    });
  });
});
