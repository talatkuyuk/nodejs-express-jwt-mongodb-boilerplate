const request = require("supertest");
const httpStatus = require("http-status");

const app = require("../../src/core/express");

const {
  authuserService,
  authuserDbService,
  tokenService,
  tokenDbService,
} = require("../../src/services");
const { tokenTypes } = require("../../src/config/tokens");

const TestUtil = require("../testutils/TestUtil");
const testData = require("../testutils/testdata");

const { setupTestDatabase } = require("../setup/setupTestDatabase");
const { setupRedis } = require("../setup/setupRedis");

setupTestDatabase();
setupRedis();

describe("POST /auth/verify-email", () => {
  describe("Request Validation (token) Errors", () => {
    test("should return 422 Validation Error if there is no token", async () => {
      const response = await request(app).post("/auth/verify-email").send({});

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors.token).toEqual(["token is missing"]);
    });

    test("should return 422 Validation Error if the token is undefined", async () => {
      const verifyEmailForm = {
        token: undefined,
      };

      const response = await request(app).post("/auth/verify-email").send(verifyEmailForm);

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors.token).toEqual(["token is missing"]);
    });
  });

  describe("Verify-Email Token Errors", () => {
    test("should throw ApiError with code 401 if the verify-email token is expired", async () => {
      const verifyEmailForm = {
        token: testData.VERIFY_EMAIL_TOKEN_EXPIRED,
      };

      const response = await request(app).post("/auth/verify-email").send(verifyEmailForm);

      TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
      expect(response.body.error.name).toEqual("TokenExpiredError");
      expect(response.body.error.message).toEqual("jwt expired");
    });

    test("should throw ApiError with code 401 if the verify-email token has wrong signature", async () => {
      const verifyEmailForm = {
        token: testData.TOKEN_WITH_INVALID_SIGNATURE,
      };

      const response = await request(app).post("/auth/verify-email").send(verifyEmailForm);

      TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
      expect(response.body.error.name).toEqual("JsonWebTokenError");
      expect(response.body.error.message).toEqual("invalid signature");
    });

    test("should throw ApiError with code 401 if the token is malformed", async () => {
      const verifyEmailForm = { token: "mal-formed-token" };

      const response = await request(app).post("/auth/verify-email").send(verifyEmailForm);

      TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
      expect(response.body.error.name).toEqual("JsonWebTokenError");
      expect(response.body.error.message).toEqual("jwt malformed");
    });
  });

  describe("Failed verify-email process related with the database", () => {
    test("should return status 401, if there is no such token in the database", async () => {
      const authuser_id = "123456789012345678901234";

      // generate and add valid verify-email token into db
      const verifyEmailToken = await tokenService.generateVerifyEmailToken(authuser_id);

      // delete the token
      await tokenService.removeToken(verifyEmailToken.id);

      const verifyEmailForm = { token: verifyEmailToken.token };

      const response = await request(app).post("/auth/verify-email").send(verifyEmailForm);

      TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
      expect(response.body.error.name).toEqual("ApiError");
      expect(response.body.error.message).toEqual("The token is not valid");
    });

    test("should return status 401, if the token is blacklisted in the database", async () => {
      const authuser_id = "123456789012345678901234";

      // generate and add valid verify-email token into db
      const verifyEmailToken = await tokenService.generateVerifyEmailToken(authuser_id);

      // update the token as blacklisted
      await tokenService.updateTokenAsBlacklisted(verifyEmailToken.id);

      const verifyEmailForm = { token: verifyEmailToken.token };

      const response = await request(app).post("/auth/verify-email").send(verifyEmailForm);

      TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
      expect(response.body.error.name).toEqual("ApiError");
      expect(response.body.error.message).toEqual("The token is blacklisted");
    });
  });

  describe("Failed verify-email process related with the user", () => {
    test("should return status 404, if there is no user", async () => {
      const authuser_id = "123456789012345678901234";

      // generate and add valid verify-email token into db
      const verifyEmailToken = await tokenService.generateVerifyEmailToken(authuser_id);

      const verifyEmailForm = { token: verifyEmailToken.token };

      const response = await request(app).post("/auth/verify-email").send(verifyEmailForm);

      TestUtil.errorExpectations(response, httpStatus.NOT_FOUND);
      expect(response.body.error.name).toEqual("ApiError");
      expect(response.body.error.message).toEqual("No user found");
    });

    test("should return status 404, if the user is disabled", async () => {
      // add the authuser into db
      const authuser = await authuserDbService.addAuthUser({
        email: "talat@gmail.com",
        password: "no-matters-for-this-test",
      });

      if (!authuser) {
        throw new Error("Unexpected fail in db operation while adding an authuser");
      }

      // generate and add valid verify-email token into db
      const verifyEmailToken = await tokenService.generateVerifyEmailToken(authuser.id);

      // update the authuser as disabled
      await authuserService.toggleAbility(authuser.id);

      const verifyEmailForm = { token: verifyEmailToken.token };

      const response = await request(app).post("/auth/verify-email").send(verifyEmailForm);

      TestUtil.errorExpectations(response, httpStatus.FORBIDDEN);
      expect(response.body.error.name).toEqual("ApiError");
      expect(response.body.error.message).toEqual(
        "You are disabled, call the system administrator",
      );
    });
  });

  describe("Success verify-email process", () => {
    test("should return status 204, delete verify-email tokens of the user", async () => {
      // add the authuser into db
      const authuser = await authuserDbService.addAuthUser({
        email: "talat@gmail.com",
        password: "no-matters-for-this-test",
      });

      if (!authuser) {
        throw new Error("Unexpected fail in db operation while adding an authuser");
      }

      // generate and add valid verify-email token into db
      const verifyEmailToken = await tokenService.generateVerifyEmailToken(authuser.id);

      const verifyEmailForm = { token: verifyEmailToken.token };

      const response = await request(app).post("/auth/verify-email").send(verifyEmailForm);

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body.success).toBe(true);

      // check the database if the authuser's verify-email tokens are deleted
      const data = await tokenDbService.getTokens({
        user: authuser.id,
        type: tokenTypes.VERIFY_EMAIL,
      });
      expect(data.length).toBe(0);
    });
  });
});
