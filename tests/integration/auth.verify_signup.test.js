const request = require("supertest");
const httpStatus = require("http-status");

const app = require("../../src/core/express");

const {
  authuserService,
  authuserDbService,
  tokenService,
  tokenDbService,
} = require("../../src/services");
const { AuthUser } = require("../../src/models");
const { tokenTypes } = require("../../src/config/tokens");

const TestUtil = require("../testutils/TestUtil");
const testData = require("../testutils/testdata");

const { setupTestDatabase } = require("../setup/setupTestDatabase");
const { setupRedis } = require("../setup/setupRedis");

setupTestDatabase();
setupRedis();

describe("POST /auth/verify-signup", () => {
  describe("Request Validation (token) Errors", () => {
    test("should return 422 Validation Error if there is no token", async () => {
      const response = await request(app).post("/auth/verify-signup").send({});

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors.token).toEqual(["token is missing"]);
    });

    test("should return 422 Validation Error if the token is undefined", async () => {
      const verifySignupForm = {
        token: undefined,
      };

      const response = await request(app)
        .post("/auth/verify-signup")
        .send(verifySignupForm);

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors.token).toEqual(["token is missing"]);
    });
  });

  describe("Verify-Email Token Errors", () => {
    test("should throw ApiError with code 401 if the verify-signup token is expired", async () => {
      const verifySignupForm = {
        token: tokenService.generateTokenForTest(
          tokenTypes.VERIFY_SIGNUP,
          "u-s-e-r-i-d",
          [0, "miliseconds"]
        ),
      };

      const response = await request(app)
        .post("/auth/verify-signup")
        .send(verifySignupForm);

      TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
      expect(response.body.error.name).toEqual("TokenExpiredError");
      expect(response.body.error.message).toEqual("jwt expired");
    });

    test("should throw ApiError with code 401 if the verify-signup token has wrong signature", async () => {
      const verifySignupForm = {
        token: testData.TOKEN_WITH_INVALID_SIGNATURE,
      };

      const response = await request(app)
        .post("/auth/verify-signup")
        .send(verifySignupForm);

      TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
      expect(response.body.error.name).toEqual("JsonWebTokenError");
      expect(response.body.error.message).toEqual("invalid signature");
    });

    test("should throw ApiError with code 401 if the token is malformed", async () => {
      const verifySignupForm = {
        token: "mal-formed-token",
      };

      const response = await request(app)
        .post("/auth/verify-signup")
        .send(verifySignupForm);

      TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
      expect(response.body.error.name).toEqual("JsonWebTokenError");
      expect(response.body.error.message).toEqual("jwt malformed");
    });
  });

  describe("Failed verify-signup process related with the database", () => {
    test("should return status 401, if there is no such token in the database", async () => {
      const authuser_id = "123456789012345678901234";

      // generate and add valid verify-signup token into db
      const verifySignupToken = await tokenService.generateVerifySignupToken(
        authuser_id
      );

      // delete the token
      await tokenService.removeToken(verifySignupToken.id);

      const verifySignupForm = { token: verifySignupToken.token };

      const response = await request(app)
        .post("/auth/verify-signup")
        .send(verifySignupForm);

      TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
      expect(response.body.error.name).toEqual("ApiError");
      expect(response.body.error.message).toEqual("the token is not valid");
    });

    test("should return status 401, if the token is blacklisted in the database", async () => {
      const authuser_id = "123456789012345678901234";

      // generate and add valid verify-signup token into db
      const verifySignupToken = await tokenService.generateVerifySignupToken(
        authuser_id
      );

      // update the token as blacklisted
      await tokenService.updateTokenAsBlacklisted(verifySignupToken.id);

      const verifySignupForm = { token: verifySignupToken.token };

      const response = await request(app)
        .post("/auth/verify-signup")
        .send(verifySignupForm);

      TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
      expect(response.body.error.name).toEqual("ApiError");
      expect(response.body.error.message).toEqual(
        "the token is in the blacklist"
      );
    });
  });

  describe("Failed verify-signup process related with the user", () => {
    test("should return status 404, if there is no user", async () => {
      const authuser_id = "123456789012345678901234";

      // generate and add valid verify-signup token into db
      const verifySignupToken = await tokenService.generateVerifySignupToken(
        authuser_id
      );

      const verifySignupForm = { token: verifySignupToken.token };

      const response = await request(app)
        .post("/auth/verify-signup")
        .send(verifySignupForm);

      TestUtil.errorExpectations(response, httpStatus.NOT_FOUND);
      expect(response.body.error.name).toEqual("ApiError");
      expect(response.body.error.message).toEqual("No user found");
    });

    test("should return status 404, if the user is disabled", async () => {
      const authuserDoc = AuthUser.fromDoc({
        email: "talat@gmail.com",
        password: "no-matters-for-this-test",
      });

      // add the authuser into db
      const authuser = await authuserDbService.addAuthUser(authuserDoc);

      // generate and add valid verify-signup token into db
      const verifySignupToken = await tokenService.generateVerifySignupToken(
        authuser.id
      );

      // update the authuser as disabled
      await authuserService.toggleAbility(authuser.id);

      const verifySignupForm = { token: verifySignupToken.token };

      const response = await request(app)
        .post("/auth/verify-signup")
        .send(verifySignupForm);

      TestUtil.errorExpectations(response, httpStatus.FORBIDDEN);
      expect(response.body.error.name).toEqual("ApiError");
      expect(response.body.error.message).toEqual(
        "You are disabled, call the system administrator"
      );
    });
  });

  describe("Success verify-signup process", () => {
    test("should return status 204, delete verify-signup tokens of the user", async () => {
      const authuserDoc = AuthUser.fromDoc({
        email: "talat@gmail.com",
        password: "no-matters-for-this-test",
      });

      // add the authuser into db
      const authuser = await authuserDbService.addAuthUser(authuserDoc);

      // generate and add valid verify-signup token into db
      const verifySignupToken = await tokenService.generateVerifySignupToken(
        authuser.id
      );

      const verifySignupForm = { token: verifySignupToken.token };

      const response = await request(app)
        .post("/auth/verify-signup")
        .send(verifySignupForm);

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body.success).toBe(true);

      // check the database if the authuser's verify-signup tokens are deleted
      const data = await tokenDbService.getTokens({
        user: authuser.id,
        type: tokenTypes.VERIFY_SIGNUP,
      });
      expect(data.length).toBe(0);
    });
  });
});
