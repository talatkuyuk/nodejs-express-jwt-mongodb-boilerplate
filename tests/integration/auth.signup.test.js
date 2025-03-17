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

describe("POST /auth/signup", () => {
  describe("Request Validation Errors", () => {
    test("should return 422 Validation Error if email is empty", async () => {
      const registerform = { password: "Pass1word.", passwordConfirmation: "Pass1word." };
      const response = await request(app).post("/auth/signup").send(registerform);

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors.email).toEqual(["must not be empty"]);
      expect(response.body.error.errors).not.toHaveProperty("password");
      expect(response.body.error.errors).not.toHaveProperty("passwordConfirmation");
    });

    test("should return 422 Validation Error if email is invalid form", async () => {
      const registerform = {
        email: "talat1@com",
        password: "Pass1word.",
        passwordConfirmation: "Pass1word.",
      };
      const response = await request(app).post("/auth/signup").send(registerform);

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors.email).toEqual(["must be valid email address"]);
      expect(response.body.error.errors).not.toHaveProperty("password");
      expect(response.body.error.errors).not.toHaveProperty("passwordConfirmation");
    });

    test("should return 422 Validation Error if password is empty", async () => {
      const registerform = {
        email: "talat@google.com",
        password: "",
        passwordConfirmation: "",
      };
      const response = await request(app).post("/auth/signup").send(registerform);

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors).not.toHaveProperty("email");
      expect(response.body.error.errors.password).toEqual(["must not be empty"]);
      expect(response.body.error.errors.passwordConfirmation).toEqual(["must not be empty"]);
    });

    test("should return 422 Validation Error if password length is less than 8 characters", async () => {
      const registerform = {
        email: "talat@google.com",
        password: "12aA",
        passwordConfirmation: "12aA",
      };
      const response = await request(app).post("/auth/signup").send(registerform);

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors).not.toHaveProperty("email");
      expect(response.body.error.errors).not.toHaveProperty("passwordConfirmation");
      expect(response.body.error.errors.password).toEqual(["must be minimum 8 characters"]);
    });

    test("should return 422 Validation Error if password does not contain at least one uppercase, one lowercase, one number and one special char", async () => {
      const registerform = {
        email: "talat@google.com",
        password: "11aaAA88",
        passwordConfirmation: "11aaAA88",
      };
      const response = await request(app).post("/auth/signup").send(registerform);

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors).not.toHaveProperty("email");
      expect(response.body.error.errors).not.toHaveProperty("passwordConfirmation");
      expect(response.body.error.errors.password).toEqual([
        "must contain uppercase, lowercase, number and special char",
      ]);
    });

    test("should return 422 Validation Error if password confirmation does not match with the password", async () => {
      const registerform = {
        email: "talat@google.com",
        password: "11aaAA88+",
        passwordConfirmation: "11aaAA88$",
      };
      const response = await request(app).post("/auth/signup").send(registerform);

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors).not.toHaveProperty("email");
      expect(response.body.error.errors).not.toHaveProperty("password");
      expect(response.body.error.errors.passwordConfirmation).toEqual([
        "should match with the password",
      ]);
    });

    test("should return 422 Validation Error if occurs all email, password, confirmation password validation errors", async () => {
      const registerform = {
        email: "talat@gmail",
        password: "11aaAA",
        passwordConfirmation: "11aaAA88$",
      };
      const response = await request(app).post("/auth/signup").send(registerform);

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors).toEqual({
        email: ["must be valid email address"],
        password: ["must be minimum 8 characters"],
        passwordConfirmation: ["should match with the password"],
      });
    });
  });

  describe("Failed signups", () => {
    test("should return 401 Unauthorized Error if there is an authuser with the same email and the user's password is not null, meaningly the user is registered with the email/password before", async () => {
      await authuserDbService.addAuthUser({
        email: "talat@google.com",
        password: "HashedPass1word.HashedString.HashedPass1word",
      });

      const registerform = {
        email: "talat@google.com",
        password: "Pass1word.",
        passwordConfirmation: "Pass1word.",
      };

      const response = await request(app).post("/auth/signup").send(registerform);

      TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
      expect(response.body.error.message).toEqual("email is already taken");
      expect(response.body.error.errorPath).toEqual(
        "failed in AuthService [signupWithEmailAndPassword]  --->  AuthController [signup]",
      );
    });
  });

  describe("Success registration", () => {
    test("should return status 200, the authuser and the valid tokens in json form; successfully update the user's password, there is an authuser with the same email but registered with a provider", async () => {
      const google_id = "365487263597623948576";
      const google_email = "talat@gmail.com";

      await authuserDbService.addAuthUser({
        email: google_email,
        password: null, // the user registered with an auth provider
        isEmailVerified: true,
        providers: { google: google_id },
      });

      const registerform = {
        email: google_email,
        password: "Pass1word.",
        passwordConfirmation: "Pass1word.",
      };

      const response = await request(app).post("/auth/signup").send(registerform);

      expect(response.status).toBe(httpStatus.OK);
      expect(response.headers["content-type"]).toEqual(expect.stringContaining("json"));
      expect(response.headers["location"]).toEqual(expect.stringContaining("/authusers/"));

      TestUtil.CheckTokenConsistency(response.body.data.tokens, response.body.data.authuser.id);

      // check the whole response body expected
      expect(response.body).toEqual({
        success: true,
        data: {
          authuser: {
            id: expect.stringMatching(/^[0-9a-fA-F]{24}$/), // valid mongodb ObjectId: 24-size hex value
            email: google_email,
            isEmailVerified: true,
            isDisabled: false,
            createdAt: expect.any(Number), // 1631868212022
            updatedAt: expect.any(Number),
            providers: {
              emailpassword: false, // means that the user needs to verify the password assignment with his email
              google: google_id,
            },
          },
          tokens: TestUtil.ExpectedTokens,
        },
      });

      // check the refresh token is stored into database
      TestUtil.CheckRefreshTokenStoredInDB(response);

      // check the authuser is stored into database
      const authuser = await authuserDbService.getAuthUser({
        email: response.body.data.authuser.email,
      });

      if (!authuser) {
        throw new Error("Unexpected fail in db operation while adding an authuser");
      }

      expect(authuser.providers?.["google"]).toBe(google_id);

      expect(authuser).toEqual(expect.objectContaining({ id: response.body.data.authuser.id }));

      // check the authuser's password is setted and hashed in the database
      expect(authuser.password).not.toBeNull(); // before it was null
      expect(authuser.password).not.toEqual(registerform.password);

      if (authuser.password !== null) {
        const data = await bcrypt.compare(registerform.password, authuser.password);
        expect(data).toBeTruthy();
      }
    });

    test("should return status 201, the authuser and the valid tokens in json form; successfully register the user if there is no authuser with the same email", async () => {
      const registerform = {
        email: "talat@google.com",
        password: "Pass1word.",
        passwordConfirmation: "Pass1word.",
      };

      const response = await request(app).post("/auth/signup").send(registerform);

      expect(response.status).toBe(httpStatus.CREATED);
      expect(response.headers["content-type"]).toEqual(expect.stringContaining("json"));
      expect(response.headers["location"]).toEqual(expect.stringContaining("/authusers/"));

      TestUtil.CheckTokenConsistency(response.body.data.tokens, response.body.data.authuser.id);

      // check the whole response body expected
      expect(response.body).toEqual({
        success: true,
        data: {
          authuser: {
            id: expect.stringMatching(/^[0-9a-fA-F]{24}$/), // valid mongodb ObjectId: 24-size hex value
            email: registerform.email,
            isEmailVerified: false, // the user needs to verify his email
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

      // check the new authuser is stored into database
      const authuser = await authuserDbService.getAuthUser({
        id: response.body.data.authuser.id,
        email: response.body.data.authuser.email,
      });

      if (!authuser) {
        throw new Error("Unexpected fail in db operation while adding an authuser");
      }

      expect(authuser).toEqual(expect.objectContaining({ id: expect.any(String) }));

      // check the new authuser password is hashed in the database
      expect(authuser.password).not.toEqual(registerform.password);

      if (authuser.password !== null) {
        const data = await bcrypt.compare(registerform.password, authuser.password);
        expect(data).toBeTruthy();
      }
    });
  });
});
