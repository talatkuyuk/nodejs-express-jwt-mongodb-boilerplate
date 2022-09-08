const httpMocks = require("node-mocks-http");
const httpStatus = require("http-status");

// without the express app which is actually not necessary, the tests stucks, I don't know the reason
const app = require("../../src/core/express");

const { oAuth } = require("../../src/middlewares");
const { authProviders, redisService } = require("../../src/services");
const ApiError = require("../../src/utils/ApiError");

const TestUtil = require("../testutils/TestUtil");

const { setupRedis } = require("../setup/setupRedis");

setupRedis();

describe("oAuth Middleware", () => {
  describe("Failed Authentications with oAuth handled by passport", () => {
    test("should throw error, if no headers.authorization", async () => {
      // There is no request header
      const req = httpMocks.createRequest();
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await oAuth("google")(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      // the error comes from the passport bearer strategy
      expect(err.statusCode).toBe(httpStatus.BAD_REQUEST);
      expect(err.name).toBe("ApiError");
      expect(err.message).toContain(
        "Badly formed Authorization Header with Bearer."
      );
    });

    test("should throw error, if the authorization header is composed in bad format", async () => {
      const requestHeader = { headers: { Authorization: "Bearer " } };

      const req = httpMocks.createRequest(requestHeader);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await oAuth("facebook")(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      // the error comes from the passport bearer strategy
      expect(err.statusCode).toBe(httpStatus.BAD_REQUEST);
      expect(err.name).toBe("ApiError");
      expect(err.message).toContain(
        "Badly formed Authorization Header with Bearer."
      );
    });
  });

  describe("Failed Authentications with oAuth handled by providers", () => {
    TestUtil.CheckOneOf();

    test("should throw error, if attached id-token is invalid (google)", async () => {
      const google_id_token = "the-id-token-came-from-google"; // invalid token

      const requestHeader = {
        query: { method: "token" },
        headers: {
          Authorization: `Bearer ${google_id_token}`,
        },
      };

      const req = httpMocks.createRequest(requestHeader);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await oAuth("google")(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      // the error comes from the package 'google-auth-library' in authProvider.google
      expect(err.statusCode).toBe(httpStatus.UNAUTHORIZED);
      expect(err.name).toBeOneOf(["ApiError", "FetchError"]);
      if (err.name === "ApiError")
        expect(err.message).toEqual(
          "The provided google id token is not valid"
        );
      else if (err.name === "FetchError")
        // if there is no internet connection
        expect(err.message).toEqual(
          "Auth provider connection error occured, try later"
        );
    });

    test("should throw error, if attached code is invalid (google)", async () => {
      const google_auth_code = "the-auth-code-coming-from-google"; // invalid code

      const requestHeader = {
        query: { method: "code" },
        headers: {
          Authorization: `Bearer ${google_auth_code}`,
        },
      };

      const req = httpMocks.createRequest(requestHeader);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await oAuth("google")(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      // the error comes from the package 'google-auth-library' in authProvider.google
      expect(err.statusCode).toBe(httpStatus.UNAUTHORIZED);
      expect(err.name).toBeOneOf(["ApiError", "FetchError"]);
      if (err.name === "ApiError")
        expect(err.message).toEqual(
          "The provided google authorization code is not valid"
        );
      else if (err.name === "FetchError")
        // if there is no internet connection
        expect(err.message).toEqual(
          "Auth provider connection error occured, try later"
        );
    });

    test("should throw error, if attached access-token is invalid (facebook)", async () => {
      const facebook_access_token = "the-access-token-came-from-facebook"; // invalid token

      const requestHeader = {
        headers: { Authorization: `Bearer ${facebook_access_token}` },
      };

      const req = httpMocks.createRequest(requestHeader);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await oAuth("facebook")(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      // the error comes from the facebook
      expect(err.statusCode).toBe(httpStatus.UNAUTHORIZED);
      expect(err.name).toBeOneOf(["ApiError", "AxiosError"]);
      if (err.name === "ApiError")
        expect(err.message).toEqual(
          "The provided facebook access token is not valid"
        );
      else if (err.name === "AxiosError")
        // if there is no internet connection
        expect(err.message).toEqual(
          "Auth provider connection error occured, try later"
        );
    });

    test("should throw error, if the oAuth info returned by provider does not give identification (google)", async () => {
      const provider = "google";
      const google_id_token = "the-id-token-came-from-google";

      const customImplementation = () => ({
        provider,
        user: { id: undefined, email: undefined },
      });

      const spyOnGoogle = jest
        .spyOn(authProviders, "google")
        .mockImplementation(customImplementation);

      const requestHeader = {
        query: { method: "token" },
        headers: {
          Authorization: `Bearer ${google_id_token}`,
        },
      };

      const req = httpMocks.createRequest(requestHeader);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await oAuth("google")(req, res, next);

      expect(spyOnGoogle).toHaveBeenCalledWith(google_id_token, "token");
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      // the error comes from the facebook
      expect(err.statusCode).toBe(httpStatus.UNAUTHORIZED);
      expect(err.name).toBe("ApiError");
      expect(err.message).toContain(
        `${provider} authentication could not be associated with any identification`
      );

      expect(req.oAuth).toBeFalsy();
    });

    test("should throw error, if the oAuth info returned by provider does not give email info (facebook)", async () => {
      const provider = "facebook";
      const facebook_access_token = "the-access-token-came-from-facebook";

      const customImplementation = () => ({
        provider,
        user: { id: "284698243598294598745", email: undefined },
      });
      const spyOnFacebook = jest
        .spyOn(authProviders, "facebook")
        .mockImplementation(customImplementation);

      const requestHeader = {
        headers: {
          Authorization: `Bearer ${facebook_access_token}`,
        },
      };

      const req = httpMocks.createRequest(requestHeader);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await oAuth("facebook")(req, res, next);

      expect(spyOnFacebook).toHaveBeenCalledWith(
        facebook_access_token,
        undefined
      );
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      // the error comes from the facebook
      expect(err.statusCode).toBe(httpStatus.UNAUTHORIZED);
      expect(err.name).toBe("ApiError");
      expect(err.message).toContain(
        `${provider} authentication does not contain necessary email information`
      );

      expect(req.oAuth).toBeFalsy();
    });
  });

  describe("Success Authentication with oAuth", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test("should continue next middleware with oAuth id_token attached to the request (google)", async () => {
      const authuser = {
        id: "123456789012345678901234",
        email: "talat@gmail.com",
      };

      const provider = "google";
      const google_id_token = "the-id-token-came-from-google";
      const provider_response = {
        provider,
        token: google_id_token,
        expiresIn: 60,
        user: authuser,
      };

      const customImplementation = () => provider_response;

      const spyOnGoogle = jest
        .spyOn(authProviders, "google")
        .mockImplementation(customImplementation);

      const spyOnRedisCheck = jest
        .spyOn(redisService, "check_in_blacklist")
        .mockImplementation(() => false);

      const spyOnRedisPut = jest
        .spyOn(redisService, "put_into_blacklist")
        .mockImplementation(() => true);

      const requestHeader = {
        query: { method: "token" },
        headers: { Authorization: `Bearer ${google_id_token}` },
      };

      const req = httpMocks.createRequest(requestHeader);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await oAuth("google")(req, res, next);

      expect(spyOnGoogle).toHaveBeenCalledWith(google_id_token, "token");
      expect(spyOnRedisCheck).toHaveBeenCalledWith(google_id_token);
      expect(spyOnRedisPut).toHaveBeenCalledWith("token", provider_response);
      expect(next).toHaveBeenCalledWith();
      expect(req.oAuth).toEqual(provider_response);
    });

    test("should continue next middleware with oAuth authorization code attached to the request (google)", async () => {
      const authuser = {
        id: "123456789012345678901234",
        email: "talat@gmail.com",
      };

      const provider = "google";
      const google_auth_code = "the-auth-code-coming-from-google";
      const google_id_token = "the-id-token-came-from-google";
      const provider_response = {
        provider,
        token: google_id_token,
        expiresIn: 60,
        user: authuser,
      };

      const customImplementation = () => provider_response;

      const spyOnGoogle = jest
        .spyOn(authProviders, "google")
        .mockImplementation(customImplementation);

      const spyOnRedisCheck = jest
        .spyOn(redisService, "check_in_blacklist")
        .mockImplementation(() => false);

      const spyOnRedisPut = jest
        .spyOn(redisService, "put_into_blacklist")
        .mockImplementation(() => true);

      const requestHeader = {
        query: { method: "code" },
        headers: { Authorization: `Bearer ${google_auth_code}` },
      };

      const req = httpMocks.createRequest(requestHeader);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await oAuth("google")(req, res, next);

      expect(spyOnGoogle).toHaveBeenCalledWith(google_auth_code, "code");
      expect(spyOnRedisCheck).toHaveBeenCalledWith(google_id_token);
      expect(spyOnRedisPut).toHaveBeenCalledWith("token", provider_response);
      expect(next).toHaveBeenCalledWith();
      expect(req.oAuth).toEqual(provider_response);
    });

    test("should continue next middleware with oAuth attached to the request (facebook)", async () => {
      const authuser = {
        id: "123456789012345678901234",
        email: "talat@gmail.com",
      };

      const provider = "facebook";
      const facebook_access_token = "the-access-token-came-from-facebook";
      const provider_response = {
        provider,
        token: facebook_access_token,
        expiresIn: 60,
        user: authuser,
      };

      const customImplementation = () => provider_response;

      const spyOnFacebook = jest
        .spyOn(authProviders, "facebook")
        .mockImplementation(customImplementation);

      const spyOnRedisCheck = jest
        .spyOn(redisService, "check_in_blacklist")
        .mockImplementation(() => false);

      const spyOnRedisPut = jest
        .spyOn(redisService, "put_into_blacklist")
        .mockImplementation(() => true);

      const requestHeader = {
        headers: { Authorization: `Bearer ${facebook_access_token}` },
      };

      const req = httpMocks.createRequest(requestHeader);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await oAuth("facebook")(req, res, next);

      expect(spyOnFacebook).toHaveBeenCalledWith(
        facebook_access_token,
        undefined
      );
      expect(spyOnRedisCheck).toHaveBeenCalledWith(facebook_access_token);
      expect(spyOnRedisPut).toHaveBeenCalledWith("token", provider_response);
      expect(next).toHaveBeenCalledWith();
      expect(req.oAuth).toEqual(provider_response);
    });
  });
});
