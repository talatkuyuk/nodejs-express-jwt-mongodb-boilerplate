const { status: httpStatus } = require("http-status");
const moment = require("moment");
const jwt = require("jsonwebtoken");
const httpMocks = require("node-mocks-http");
// const shell = require("shelljs"); // in order to shotdown and restart redis to test behavior

// without this statement, which is actually not necessary, the tests stucks, I don't know the reason
require("../../src/core/express");

// const config = require("../../src/config");
const { authenticate } = require("../../src/middlewares");
const ApiError = require("../../src/utils/ApiError");

const {
  authuserDbService,
  authuserService,
  tokenService,
  redisService,
} = require("../../src/services");
const { tokenTypes } = require("../../src/config/tokens");

const TestUtil = require("../testutils/TestUtil");
const testData = require("../testutils/testdata");

const { setupTestDatabase } = require("../setup/setupTestDatabase");
const { setupRedis } = require("../setup/setupRedis");

setupTestDatabase();
setupRedis();

describe("Auth Middleware", () => {
  /**
   *
   * @param {httpMocks.RequestOptions|undefined} request
   * @param {ApiError} expectedError
   * @returns {Promise<void>}
   */
  const commonFailedAuthenticateTestProcess = async (request, expectedError) => {
    const req = httpMocks.createRequest(request);
    const res = httpMocks.createResponse();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next).toHaveBeenCalledWith(expect.toBeMatchedWithError(expectedError));
  };

  describe("Request Header and Access Token Errors", () => {
    test("should throw ApiError with code 401, if Authorization Header is absent", async () => {
      const request = undefined;
      const expectedError = new ApiError(httpStatus.UNAUTHORIZED, "No auth token");
      await commonFailedAuthenticateTestProcess(request, expectedError);
    });

    test("should throw ApiError with code 401, if Authorization Header is bad formed without Bearer", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = { headers: { Authorization: testData.ACCESS_TOKEN_EXPIRED } };

      const expectedError = new ApiError(httpStatus.UNAUTHORIZED, "No auth token");
      await commonFailedAuthenticateTestProcess(request, expectedError);
    });

    test("should throw ApiError with code 401, if Authorization Header is bad formed mistyping Baerer", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = { headers: { Authorization: `Baerer ${testData.ACCESS_TOKEN_EXPIRED}` } };

      const expectedError = new ApiError(httpStatus.UNAUTHORIZED, "No auth token");
      await commonFailedAuthenticateTestProcess(request, expectedError);
    });

    test("should throw ApiError with code 401, if Authorization Header is bad formed with no space between Bearer and Token", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = { headers: { Authorization: `Bearer${testData.ACCESS_TOKEN_EXPIRED}` } };

      const expectedError = new ApiError(httpStatus.UNAUTHORIZED, "No auth token");
      await commonFailedAuthenticateTestProcess(request, expectedError);
    });

    test("should throw ApiError with code 401, if access token is not in the Authorization Header", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = { headers: { Authorization: "Bearer " } };
      const expectedError = new ApiError(httpStatus.UNAUTHORIZED, "No auth token");
      await commonFailedAuthenticateTestProcess(request, expectedError);
    });

    test("should throw ApiError with code 401, if access token is expired", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = { headers: { Authorization: `Bearer ${testData.ACCESS_TOKEN_EXPIRED}` } };

      const expectedError = new ApiError(
        httpStatus.UNAUTHORIZED,
        "TokenExpiredError: jwt expired",
      );
      await commonFailedAuthenticateTestProcess(request, expectedError);
    });

    test("should throw ApiError with code 401, if access token has invalid signature", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        headers: { Authorization: `Bearer ${testData.ACCESS_TOKEN_WITH_INVALID_SIGNATURE}` },
      };

      const expectedError = new ApiError(
        httpStatus.UNAUTHORIZED,
        "JsonWebTokenError: invalid signature",
      );
      await commonFailedAuthenticateTestProcess(request, expectedError);
    });

    test("should throw ApiError with code 401, if access token is malformed (Undefined)", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        headers: { Authorization: `Bearer ${undefined}` }, // intentionally undefined
      };

      const expectedError = new ApiError(
        httpStatus.UNAUTHORIZED,
        "JsonWebTokenError: jwt malformed",
      );
      await commonFailedAuthenticateTestProcess(request, expectedError);
    });
  });

  describe("Failed Authentications", () => {
    jest.setTimeout(50000);

    const userAgent = "from-jest-test";

    /** @type {string} */
    let accessToken;

    /** @type {string} */
    let refreshToken;

    /** @type {string} */
    let authuserId;

    beforeEach(async () => {
      const { authuser, tokens } = await TestUtil.createAuthUser(userAgent, {
        email: "talat@google.com",
        password: "Pass1word!",
      });

      authuserId = authuser.id;
      accessToken = tokens.access.token;
      refreshToken = tokens.refresh.token;
    });

    test("should throw ApiError with code 401, if access token does not refer any user", async () => {
      await authuserDbService.deleteAuthUser(authuserId);

      /** @type {httpMocks.RequestOptions} */
      const request = {
        headers: { Authorization: `Bearer ${accessToken}` },
        useragent: { source: userAgent },
      };

      const expectedError = new ApiError(
        httpStatus.UNAUTHORIZED,
        "The access token does not refer any user",
      );

      await commonFailedAuthenticateTestProcess(request, expectedError);
    });

    test("should throw ApiError with code 401, if refresh token is used as access token", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        headers: { Authorization: `Bearer ${refreshToken}` },
        useragent: { source: userAgent },
      };

      const expectedError = new ApiError(
        httpStatus.UNAUTHORIZED,
        "NotBeforeError: jwt not active",
      ); // since Refresh Token is used before "not valid before"

      await commonFailedAuthenticateTestProcess(request, expectedError);
    });

    test("should throw ApiError with code 401, if verify email token is used as access token", async () => {
      const verifyEmailToken = await tokenService.generateVerifyEmailToken(authuserId);

      /** @type {httpMocks.RequestOptions} */
      const request = {
        headers: { Authorization: `Bearer ${verifyEmailToken.token}` },
        useragent: { source: userAgent },
      };

      const expectedError = new ApiError(httpStatus.UNAUTHORIZED, "Invalid token type");

      await commonFailedAuthenticateTestProcess(request, expectedError);
    });

    test("should throw ApiError with code 401, if access token that belongs to other user is used", async () => {
      // This means that it is stolen, the only prevention is to check the useragent which is embedded in the access token
      const userAgent2 = "from-google-chrome";

      const { tokens: tokens2 } = await TestUtil.createAuthUser(userAgent2, {
        email: "talat@google.com",
        password: "Pass1word!",
      });

      // authuser tries to use authuser2's access token but using different user agent
      /** @type {httpMocks.RequestOptions} */
      const request = {
        headers: { Authorization: `Bearer ${tokens2.access.token}` },
        useragent: { source: userAgent },
      };

      const expectedError = new ApiError(
        httpStatus.UNAUTHORIZED,
        "Your browser/agent seems changed or updated, you have to re-login",
      );

      await commonFailedAuthenticateTestProcess(request, expectedError);
    });

    test("should throw ApiError with code 401, if access token is generated with an invalid secret", async () => {
      accessToken = tokenService.generateToken(
        authuserId,
        moment().add(5, "minutes"),
        tokenTypes.ACCESS,
        "jti",
        userAgent,
        0,
        "INVALID-SECRET",
      );

      /** @type {httpMocks.RequestOptions} */
      const request = {
        headers: { Authorization: `Bearer ${accessToken}` },
        useragent: { source: userAgent },
      };

      const expectedError = new ApiError(
        httpStatus.UNAUTHORIZED,
        "JsonWebTokenError: invalid signature",
      );

      await commonFailedAuthenticateTestProcess(request, expectedError);
    });

    test("should throw ApiError with code 403, if the user is disabled", async () => {
      // update the authuser as disabled
      await authuserService.toggleAbility(authuserId);

      /** @type {httpMocks.RequestOptions} */
      const request = {
        headers: { Authorization: `Bearer ${accessToken}` },
        useragent: { source: userAgent },
      };

      const expectedError = new ApiError(
        httpStatus.FORBIDDEN,
        "You are disabled, call the system administrator",
      );

      await commonFailedAuthenticateTestProcess(request, expectedError);
    });

    test("should throw ApiError with code 403, if access token is in the blacklist", async () => {
      const payload = jwt.decode(accessToken, { json: true });

      if (payload?.jti) {
        await redisService.put_jti_into_blacklist(payload.jti);
      }

      /** @type {httpMocks.RequestOptions} */
      const request = {
        headers: { Authorization: `Bearer ${accessToken}` },
        useragent: { source: userAgent },
      };

      const expectedError = new ApiError(
        httpStatus.FORBIDDEN,
        "The access token is blacklisted, you have to re-login",
      );

      await commonFailedAuthenticateTestProcess(request, expectedError);
    });

    // test("should throw ApiError with code 500, if redis cache server is down while checking blacklist", async () => {
    //   console.log("Redis is getting closed intentionally for the test...");
    //   shell.exec("npm run redis:stop");
    //   await new Promise((resolve) => setTimeout(resolve, 10000));

    //   /** @type {httpMocks.RequestOptions} */
    //   const request = {
    //     headers: { Authorization: `Bearer ${accessToken}` },
    //     useragent: { source: userAgent },
    //   };

    //   const expectedError = new ApiError(
    //     httpStatus.INTERNAL_SERVER_ERROR,
    //     "We've encountered a server internal problem (Redis)",
    //   );

    //   if (config.raiseErrorWhenRedisDown) await commonFailedAuthenticateTestProcess(request, expectedError);
    //   else {
    //     const req = httpMocks.createRequest(request);
    //     const res = httpMocks.createResponse();
    //     const next = jest.fn();

    //     await authenticate(req, res, next);

    //     expect(next).toHaveBeenCalledWith();
    //     expect(req.authuserId).toEqual(authuserId);
    //   }

    //   console.log("Redis is getting re-started intentionally for the test...");
    //   shell.exec("npm run redis:restart");
    //   await new Promise((resolve) => setTimeout(resolve, 10000));
    // });
  });

  describe("Success Authentication", () => {
    test("should continue next middleware with user is attached to the request", async () => {
      const userAgent = "from-jest-test";

      const { authuser, tokens } = await TestUtil.createAuthUser(userAgent, {
        email: "talat@google.com",
        password: "Pass1word!",
      });

      /** @type {httpMocks.RequestOptions} */
      const request = {
        headers: { Authorization: `Bearer ${tokens.access.token}` },
        useragent: { source: userAgent },
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.authuser.id).toEqual(authuser.id);
    });
  });
});
