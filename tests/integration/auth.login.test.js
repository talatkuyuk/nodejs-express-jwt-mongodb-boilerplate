const request = require("supertest");
const { status: httpStatus } = require("http-status");
const bcrypt = require("bcryptjs");

const app = require("../../src/core/express");

const { authuserDbService } = require("../../src/services");

const TestUtil = require("../testutils/TestUtil");

const { setupTestDatabase } = require("../setup/setupTestDatabase");
const { setupRedis } = require("../setup/setupRedis");

setupTestDatabase();
setupRedis();

describe("POST /auth/login", () => {
  describe("Request Validation Errors", () => {
    test("should return 422 Validation Error if email is empty", async () => {
      const loginForm = { password: "Pass1word." };

      const response = await request(app).post("/auth/login").send(loginForm);

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors.email).toEqual(["must not be empty"]);
      expect(response.body.error.errors).not.toHaveProperty("password");
    });

    test("should return 422 Validation Error if email is invalid form", async () => {
      const loginForm = { email: "talat1@com", password: "Pass1word." };

      const response = await request(app).post("/auth/login").send(loginForm);

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors.email).toEqual(["must be valid email address"]);
      expect(response.body.error.errors).not.toHaveProperty("password");
    });

    test("should return 422 Validation Error if password is empty", async () => {
      const loginForm = { email: "talat@gmail.com" };

      const response = await request(app).post("/auth/login").send(loginForm);

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors).not.toHaveProperty("email");
      expect(response.body.error.errors.password).toEqual(["must not be empty"]);
    });

    test("should return 422 Validation Error if occurs both email, password validation errors", async () => {
      const loginForm = { email: "talat@gmail", password: "" };

      const response = await request(app).post("/auth/login").send(loginForm);

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors).toEqual({
        email: ["must be valid email address"],
        password: ["must not be empty"],
      });
    });
  });

  describe("Failed logins", () => {
    test("should return status 404, if the user is not registered", async () => {
      const loginForm = { email: "talat@gmail.com", password: "Pass1word." };

      const response = await request(app).post("/auth/login").send(loginForm);

      TestUtil.errorExpectations(response, httpStatus.NOT_FOUND);
      expect(response.body.error.message).toEqual("No user found");
    });

    test("should return status 403, if the user is disabled", async () => {
      const hashedPassword = await bcrypt.hash("Pass1word.", 8);

      await authuserDbService.addAuthUser({
        email: "talat@gmail.com",
        password: hashedPassword,
        isEmailVerified: false,
        isDisabled: true,
      });

      const loginForm = { email: "talat@gmail.com", password: "Pass1word." };

      const response = await request(app).post("/auth/login").send(loginForm);

      TestUtil.errorExpectations(response, httpStatus.FORBIDDEN);
      expect(response.body.error.message).toEqual(
        "You are disabled, call the system administrator",
      );
    });

    test("should return status 401, if the password is wrong", async () => {
      const hashedPassword = await bcrypt.hash("Pass1word.", 8);

      await authuserDbService.addAuthUser({
        email: "talat@gmail.com",
        password: hashedPassword,
        isEmailVerified: false,
        isDisabled: false,
      });

      const loginForm = { email: "talat@gmail.com", password: "Pass1word" };

      const response = await request(app).post("/auth/login").send(loginForm);

      TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
      expect(response.body.error.message).toEqual("Incorrect email or password");
    });
  });

  describe("Success login", () => {
    test("should return status 200, user and valid tokens in json form; successfully login user if the request is valid", async () => {
      const hashedPassword = await bcrypt.hash("Pass1word.", 8);

      const authuser = await authuserDbService.addAuthUser({
        email: "talat@gmail.com",
        password: hashedPassword,
        isEmailVerified: false,
        isDisabled: false,
        providers: { emailpassword: true },
      });

      if (!authuser) {
        throw new Error("Unexpected db error while adding a document!");
      }

      const loginForm = { email: authuser.email, password: "Pass1word." };

      const response = await request(app).post("/auth/login").send(loginForm);

      expect(response.status).toBe(httpStatus.OK);
      expect(response.headers["content-type"]).toEqual(expect.stringContaining("json"));

      TestUtil.CheckTokenConsistency(response.body.data.tokens, response.body.data.authuser.id);

      // check the whole response body expected
      expect(response.body).toEqual({
        success: true,
        data: {
          authuser: {
            id: authuser.id,
            email: authuser.email,
            isEmailVerified: false,
            isDisabled: false,
            createdAt: expect.any(Number), // 1631868212022
            updatedAt: null,
            providers: { emailpassword: true },
          },
          tokens: TestUtil.ExpectedTokens,
        },
      });

      // check the refresh token is stored into database
      TestUtil.CheckRefreshTokenStoredInDB(response);
    });
  });
});
