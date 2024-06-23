const request = require("supertest");
const httpStatus = require("http-status");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const app = require("../../src/core/express");

const { authuserDbService, authProviders } = require("../../src/services");
const { AuthUser } = require("../../src/models");

const TestUtil = require("../testutils/TestUtil");

const { setupTestDatabase } = require("../setup/setupTestDatabase");
const { setupRedis } = require("../setup/setupRedis");

setupTestDatabase();
setupRedis();

describe("POST /auth/google & auth/facebook", () => {
  describe("Request Validation Errors (for Google)", () => {
    test("should return status 422, if the query param 'method' is not provided", async () => {
      const response = await request(app).post("/auth/google").send();

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors.method).toEqual([
        "query param 'method' is missing",
      ]);
      expect(response.body.error.errors).not.toHaveProperty("body");
    });

    test("should return status 422, if the query param 'method' is other than 'code' or 'token'", async () => {
      const response = await request(app)
        .post("/auth/google?method=idtoken")
        .send();

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors.method).toEqual([
        "The query param 'method' could be only 'token' or 'code'",
      ]);
      expect(response.body.error.errors).not.toHaveProperty("body");
    });
  });

  describe("Failed continue with AuthProvider (for google)", () => {
    test("should return status 401, if the google id token is invalid", async () => {
      const google_id_token = "the-wrong-id-token-came-from-google";

      const response = await request(app)
        .post("/auth/google?method=token")
        .set("Authorization", `Bearer ${google_id_token}`)
        .send();

      TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
      expect(response.body.error.name).toBeOneOf(["ApiError", "FetchError"]);

      if (response.body.error.name === "ApiError")
        expect(response.body.error.message).toEqual(
          "The provided google id token is not valid"
        );
      else if (response.body.error.name === "FetchError")
        // if there is no internet connection
        expect(response.body.error.message).toContain(
          "Auth provider connection error occured, try later"
        );
    });

    test("should return status 401, if the google authorization code is invalid", async () => {
      const google_authorization_code =
        "the-wrong-authorization-code-came-from-google";

      const response = await request(app)
        .post("/auth/google?method=code")
        .set("Authorization", `Bearer ${google_authorization_code}`)
        .send();

      TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
      expect(response.body.error.name).toBeOneOf(["ApiError", "FetchError"]);

      if (response.body.error.name === "ApiError")
        expect(response.body.error.message).toEqual(
          "The provided google authorization code is not valid"
        );
      else if (response.body.error.name === "FetchError")
        // if there is no internet connection
        expect(response.body.error.message).toContain(
          "Auth provider connection error occured, try later"
        );
    });

    test("should return status 401, if the info returned by google does not give identification", async () => {
      const provider = "google";
      const google_id_token = "the-id-token-came-from-google";

      const customImplementation = () => ({
        provider,
        user: { id: undefined, email: undefined },
      });

      jest
        .spyOn(authProviders, "google")
        .mockImplementation(customImplementation);

      const response = await request(app)
        .post("/auth/google?method=token")
        .set("Authorization", `Bearer ${google_id_token}`)
        .send();

      TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
      expect(response.body.error.name).toBeOneOf(["ApiError", "FetchError"]);

      if (response.body.error.name === "ApiError")
        expect(response.body.error.message).toEqual(
          `${provider} authentication could not be associated with any identification`
        );
      else if (response.body.error.name === "FetchError")
        // if there is no internet connection
        expect(response.body.error.message).toContain(
          "Auth provider connection error occured, try later"
        );
    });

    test("should return status 401, if the info returned by google does not give email information", async () => {
      const provider = "google";
      const google_id_token = "the-id-token-came-from-google";

      const customImplementation = () => ({
        provider,
        user: { id: "google-id-with-some-digits", email: undefined },
      });

      jest
        .spyOn(authProviders, "google")
        .mockImplementation(customImplementation);

      const response = await request(app)
        .post("/auth/google?method=token")
        .set("Authorization", `Bearer ${google_id_token}`)
        .send();

      TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
      expect(response.body.error.name).toBeOneOf(["ApiError", "FetchError"]);

      if (response.body.error.name === "ApiError")
        expect(response.body.error.message).toEqual(
          `${provider} authentication does not contain necessary email information`
        );
      else if (response.body.error.name === "FetchError")
        // if there is no internet connection
        expect(response.body.error.message).toContain(
          "Auth provider connection error occured, try later"
        );
    });
  });

  describe("Failed continue with AuthProvider (for facebook)", () => {
    test("should return status 401, if the facebook access token is invalid", async () => {
      const facebook_access_token = "the-wrong-access-token-came-from-facebook";

      const response = await request(app)
        .post("/auth/facebook")
        .set("Authorization", `Bearer ${facebook_access_token}`)
        .send();

      TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
      expect(response.body.error.name).toBeOneOf(["ApiError", "AxiosError"]);
      expect(response.body.error.message).toBeOneOf([
        "The provided facebook access token is not valid",
        "Auth provider connection error occured, try later",
      ]);

      // if (response.body.error.name === "ApiError")
      //   expect(response.body.error.message).toEqual(
      //     "The provided facebook access token is not valid"
      //   );
      // else if (response.body.error.name === "AxiosError")
      //   // if there is no internet connection
      //   expect(response.body.error.message).toContain(
      //     "Auth provider connection error occured, try later"
      //   );
    });

    test("should return status 401, if the info returned by facebook does not give identification", async () => {
      const provider = "facebook";
      const facebook_access_token = "the-access-token-came-from-facebook";

      const customImplementation = () => ({
        provider,
        user: { id: undefined, email: undefined },
      });

      jest
        .spyOn(authProviders, "facebook")
        .mockImplementation(customImplementation);

      const response = await request(app)
        .post("/auth/facebook")
        .set("Authorization", `Bearer ${facebook_access_token}`)
        .send();

      TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
      expect(response.body.error.name).toBeOneOf(["ApiError", "FetchError"]);

      if (response.body.error.name === "ApiError")
        expect(response.body.error.message).toEqual(
          `${provider} authentication could not be associated with any identification`
        );
      else if (response.body.error.name === "FetchError")
        // if there is no internet connection
        expect(response.body.error.message).toContain(
          "Auth provider connection error occured, try later"
        );
    });

    test("should return status 401, if the info returned by facebook does not give email information", async () => {
      const provider = "facebook";
      const facebook_access_token = "the-access-token-came-from-facebook";

      const customImplementation = () => ({
        provider,
        user: { id: "facebook-id-with-some-digits", email: undefined },
      });

      jest
        .spyOn(authProviders, "facebook")
        .mockImplementation(customImplementation);

      const response = await request(app)
        .post("/auth/facebook")
        .set("Authorization", `Bearer ${facebook_access_token}`)
        .send();

      TestUtil.errorExpectations(response, httpStatus.UNAUTHORIZED);
      expect(response.body.error.name).toBeOneOf(["ApiError", "FetchError"]);

      if (response.body.error.name === "ApiError")
        expect(response.body.error.message).toEqual(
          `${provider} authentication does not contain necessary email information`
        );
      else if (response.body.error.name === "FetchError")
        // if there is no internet connection
        expect(response.body.error.message).toContain(
          "Auth provider connection error occured, try later"
        );
    });
  });

  describe("Failed logins with AuthProvider (common)", () => {
    TestUtil.CheckOneOf();

    test("should return status 403, if the oAuth provider token/code is used multiple times", async () => {
      const userAgent = "from-jest-test";

      const provider = "google";
      const provider_token = crypto.randomBytes(16).toString("hex");
      const provider_id = "365487263597623948576";
      const provider_email = "talat@gmail.com";

      const customImplementation = () => ({
        provider,
        token: provider_token,
        expiresIn: 60, // 1m
        user: { id: provider_id, email: provider_email },
      });

      jest
        .spyOn(authProviders, "google")
        .mockImplementation(customImplementation);

      const response1 = await request(app)
        .post("/auth/google?method=token")
        .set("Authorization", `Bearer ${provider_token}`)
        .set("User-Agent", userAgent)
        .send();

      expect(response1.status).toBe(httpStatus.CREATED);

      // but the second time (the same provider_token)
      const response2 = await request(app)
        .post("/auth/google?method=token")
        .set("Authorization", `Bearer ${provider_token}`)
        .set("User-Agent", userAgent)
        .send();

      TestUtil.errorExpectations(response2, httpStatus.FORBIDDEN);
      expect(response2.body.error.name).toBe("ApiError");
      expect(response2.body.error.message).toEqual(
        `The ${provider} token is blacklisted, you have to re-login`
      );
    });

    test("should return status 403, if the authuser is disabled", async () => {
      const authuser = AuthUser.fromDoc({
        email: "talat@gmail.com",
        password: await bcrypt.hash("Pass1word.", 8),
        isDisabled: true,
        providers: { emailpassword: "registered" },
      });
      await authuserDbService.addAuthUser(authuser);

      const provider = "google";
      const google_id_token = crypto.randomBytes(16).toString("hex");
      const google_id = "365487263597623948576";
      const google_email = authuser.email;

      const customImplementation = () => ({
        provider,
        token: google_id_token,
        expiresIn: 60, // 1m
        user: { id: google_id, email: google_email },
      });

      jest
        .spyOn(authProviders, "google")
        .mockImplementation(customImplementation);

      const response = await request(app)
        .post("/auth/google?method=token")
        .set("Authorization", `Bearer ${google_id_token}`)
        .send();

      TestUtil.errorExpectations(response, httpStatus.FORBIDDEN);
      expect(response.body.error.name).toBe("ApiError");
      expect(response.body.error.message).toEqual(
        "You are disabled, call the system administrator"
      );

      const authuser_in_db = await authuserDbService.getAuthUser({
        id: authuser.id,
      });

      expect(authuser_in_db.providers[provider]).toBeUndefined();
    });
  });

  describe("successful logins with AuthProvider", () => {
    test("should return status 201; return the new authuser; if the user is not registered before", async () => {
      const userAgent = "from-jest-test";

      const provider = "google";
      const google_id_token = crypto.randomBytes(16).toString("hex");
      const google_id = "365487263597623948576";
      const google_email = "talat@gmail.com";

      const customImplementation = () => ({
        provider,
        token: google_id_token,
        expiresIn: 60, // 1m
        user: { id: google_id, email: google_email },
      });

      jest
        .spyOn(authProviders, "google")
        .mockImplementation(customImplementation);

      const response = await request(app)
        .post("/auth/google?method=token")
        .set("Authorization", `Bearer ${google_id_token}`)
        .set("User-Agent", userAgent)
        .send();

      expect(response.status).toBe(httpStatus.CREATED);
      expect(response.headers["content-type"]).toEqual(
        expect.stringContaining("json")
      );

      const authuser = await authuserDbService.getAuthUser({
        id: response.body.data.authuser.id,
      });

      expect(authuser.providers[provider]).toBeDefined();
      expect(authuser.password).toBeNull();

      TestUtil.CheckTokenConsistency(
        response.body.data.tokens,
        response.body.data.authuser.id
      );

      // check the whole response body expected
      expect(response.body).toEqual({
        success: true,
        data: {
          authuser: {
            id: authuser.id,
            email: google_email,
            isEmailVerified: true,
            isDisabled: false,
            createdAt: expect.any(Number), // 1631868212022
            updatedAt: null,
            providers: {
              [provider]: google_id,
            },
          },
          tokens: TestUtil.ExpectedTokens,
        },
      });

      // check the refresh token is stored into database
      TestUtil.CheckRefreshTokenStoredInDB(response);
    });

    test("should return status 200; return the existing authuser adding the auth provider as a provider; if there is an authuser with the same email, registered with only email/password", async () => {
      const existingAuthuserDoc = AuthUser.fromDoc({
        email: "talat@gmail.com",
        password: await bcrypt.hash("Pass1word.", 8),
        isEmailVerified: false,
        providers: {
          emailpassword: true,
        },
      });

      const authuser = await authuserDbService.addAuthUser(existingAuthuserDoc);

      const userAgent = "from-jest-test";

      const provider = "facebook";
      const facebook_access_token = crypto.randomBytes(16).toString("hex");
      const facebook_id = "365487263597623948576";
      const facebook_email = authuser.email;

      const customImplementation = () => ({
        provider,
        token: facebook_access_token,
        expiresIn: 60, // 1m
        user: { id: facebook_id, email: facebook_email },
      });

      jest
        .spyOn(authProviders, "facebook")
        .mockImplementation(customImplementation);

      const response = await request(app)
        .post("/auth/facebook")
        .set("Authorization", `Bearer ${facebook_access_token}`)
        .set("User-Agent", userAgent)
        .send();

      expect(response.status).toBe(httpStatus.OK);
      expect(response.headers["content-type"]).toEqual(
        expect.stringContaining("json")
      );

      const authuser_in_db = await authuserDbService.getAuthUser({
        id: authuser.id,
      });

      expect(authuser_in_db.providers["emailpassword"]).toBe(true);
      expect(authuser_in_db.providers[provider]).toBeDefined();

      TestUtil.CheckTokenConsistency(
        response.body.data.tokens,
        response.body.data.authuser.id
      );

      // check the whole response body expected
      expect(response.body).toEqual({
        success: true,
        data: {
          authuser: {
            id: authuser.id,
            email: authuser.email,
            isEmailVerified: true, // it was false
            isDisabled: false,
            createdAt: expect.any(Number), // 1631868212022
            updatedAt: expect.any(Number),
            providers: {
              emailpassword: true,
              [provider]: facebook_id,
            },
          },
          tokens: TestUtil.ExpectedTokens,
        },
      });

      // check the refresh token is stored into database
      TestUtil.CheckRefreshTokenStoredInDB(response);
    });

    test("should return status 200; return the existing authuser without updating it; if there is an authuser with the same email, registered with only the same auth provider", async () => {
      const updatedAt = 1234567890;
      const google_email = "talat@gmail.com";
      const google_id = "a-google-id-with-some-digits";

      const existingAuthuserDoc = AuthUser.fromDoc({
        email: google_email,
        password: null,
        isEmailVerified: true,
        updatedAt,
        providers: {
          google: google_id,
        },
      });

      const authuser = await authuserDbService.addAuthUser(existingAuthuserDoc);

      const userAgent = "from-jest-test";

      const provider = "google";
      const google_id_token = crypto.randomBytes(16).toString("hex");

      const customImplementation = () => ({
        provider,
        token: google_id_token,
        expiresIn: 60, // 1m
        user: { id: google_id, email: google_email },
      });

      jest
        .spyOn(authProviders, "google")
        .mockImplementation(customImplementation);

      const response = await request(app)
        .post("/auth/google?method=token")
        .set("Authorization", `Bearer ${google_id_token}`)
        .set("User-Agent", userAgent)
        .send();

      expect(response.status).toBe(httpStatus.OK);
      expect(response.headers["content-type"]).toEqual(
        expect.stringContaining("json")
      );

      const authuser_in_db = await authuserDbService.getAuthUser({
        id: authuser.id,
      });

      expect(authuser_in_db.providers["emailpassword"]).toBeUndefined();
      expect(authuser_in_db.providers[provider]).toBeDefined();

      TestUtil.CheckTokenConsistency(
        response.body.data.tokens,
        response.body.data.authuser.id
      );

      // check the whole response body expected
      expect(response.body).toEqual({
        success: true,
        data: {
          authuser: {
            id: authuser.id,
            email: google_email,
            isEmailVerified: true,
            isDisabled: false,
            createdAt: expect.any(Number),
            updatedAt: updatedAt, // id did not change
            providers: {
              [provider]: google_id,
            },
          },
          tokens: TestUtil.ExpectedTokens,
        },
      });

      // check the refresh token is stored into database
      TestUtil.CheckRefreshTokenStoredInDB(response);
    });

    test("should return status 200; return the existing authuser adding the auth provider as a provider; if there is an authuser with the same email, registered with only another auth provider", async () => {
      const google_email = "talat@gmail.com";
      const google_id = "a-google-id-with-some-digits";
      const facebook_id = "a-facebook-id-with-some-digits";

      const existingAuthuserDoc = AuthUser.fromDoc({
        email: google_email,
        password: null,
        isEmailVerified: true,
        providers: {
          facebook: facebook_id,
        },
      });

      const authuser = await authuserDbService.addAuthUser(existingAuthuserDoc);

      const userAgent = "from-jest-test";

      const provider = "google";
      const google_id_token = crypto.randomBytes(16).toString("hex");

      const customImplementation = () => ({
        provider,
        token: google_id_token,
        expiresIn: 60, // 1m
        user: { id: google_id, email: google_email },
      });

      jest
        .spyOn(authProviders, "google")
        .mockImplementation(customImplementation);

      const response = await request(app)
        .post("/auth/google?method=token")
        .set("Authorization", `Bearer ${google_id_token}`)
        .set("User-Agent", userAgent)
        .send();

      expect(response.status).toBe(httpStatus.OK);
      expect(response.headers["content-type"]).toEqual(
        expect.stringContaining("json")
      );

      const authuser_in_db = await authuserDbService.getAuthUser({
        id: authuser.id,
      });

      expect(authuser_in_db.providers["emailpassword"]).toBeUndefined();
      expect(authuser_in_db.providers["facebook"]).toBe(facebook_id);
      expect(authuser_in_db.providers[provider]).toBeDefined();

      TestUtil.CheckTokenConsistency(
        response.body.data.tokens,
        response.body.data.authuser.id
      );

      // check the whole response body expected
      expect(response.body).toEqual({
        success: true,
        data: {
          authuser: {
            id: authuser.id,
            email: google_email,
            isEmailVerified: true,
            isDisabled: false,
            createdAt: expect.any(Number),
            updatedAt: expect.any(Number),
            providers: {
              facebook: facebook_id,
              [provider]: google_id,
            },
          },
          tokens: TestUtil.ExpectedTokens,
        },
      });

      // check the refresh token is stored into database
      TestUtil.CheckRefreshTokenStoredInDB(response);
    });

    test("should return status 200; return the existing authuser adding the auth provider as a provider; if there is an authuser with the same email, registered with: email/password and another auth provider", async () => {
      const google_email = "talat@gmail.com";
      const google_id = "a-google-id-with-some-digits";
      const facebook_id = "a-facebook-id-with-some-digits";

      const existingAuthuserDoc = AuthUser.fromDoc({
        email: google_email,
        password: await bcrypt.hash("Pass1word.", 8),
        isEmailVerified: true,
        providers: {
          emailpassword: true,
          facebook: facebook_id,
        },
      });

      const authuser = await authuserDbService.addAuthUser(existingAuthuserDoc);

      const userAgent = "from-jest-test";

      const provider = "google";
      const google_id_token = crypto.randomBytes(16).toString("hex");

      const customImplementation = () => ({
        provider,
        token: google_id_token,
        expiresIn: 60, // 1m
        user: { id: google_id, email: google_email },
      });

      jest
        .spyOn(authProviders, "google")
        .mockImplementation(customImplementation);

      const response = await request(app)
        .post("/auth/google?method=code")
        .set("Authorization", `Bearer ${google_id_token}`)
        .set("User-Agent", userAgent)
        .send();

      expect(response.status).toBe(httpStatus.OK);
      expect(response.headers["content-type"]).toEqual(
        expect.stringContaining("json")
      );

      const authuser_in_db = await authuserDbService.getAuthUser({
        id: authuser.id,
      });

      expect(authuser_in_db.providers["emailpassword"]).toBe(true);
      expect(authuser_in_db.providers["facebook"]).toBe(facebook_id);
      expect(authuser_in_db.providers[provider]).toBeDefined();

      TestUtil.CheckTokenConsistency(
        response.body.data.tokens,
        response.body.data.authuser.id
      );

      // check the whole response body expected
      expect(response.body).toEqual({
        success: true,
        data: {
          authuser: {
            id: authuser.id,
            email: google_email,
            isEmailVerified: true,
            isDisabled: false,
            createdAt: expect.any(Number),
            updatedAt: expect.any(Number),
            providers: {
              emailpassword: true,
              facebook: facebook_id,
              [provider]: google_id,
            },
          },
          tokens: TestUtil.ExpectedTokens,
        },
      });

      // check the refresh token is stored into database
      TestUtil.CheckRefreshTokenStoredInDB(response);
    });

    test("should return status 200; return the existing authuser without updating it; if there is an authuser with the same email, registered with: email/password and the same auth provider", async () => {
      const updatedAt = 1234567890;
      const google_email = "talat@gmail.com";
      const google_id = "a-google-id-with-some-digits";

      const existingAuthuserDoc = AuthUser.fromDoc({
        email: google_email,
        password: await bcrypt.hash("Pass1word.", 8),
        isEmailVerified: true,
        updatedAt,
        providers: {
          emailpassword: true,
          google: google_id,
        },
      });

      const authuser = await authuserDbService.addAuthUser(existingAuthuserDoc);

      const userAgent = "from-jest-test";

      const provider = "google";
      const google_id_token = crypto.randomBytes(16).toString("hex");

      const customImplementation = () => ({
        provider,
        token: google_id_token,
        expiresIn: 60, // 1m
        user: { id: google_id, email: google_email },
      });

      jest
        .spyOn(authProviders, "google")
        .mockImplementation(customImplementation);

      const response = await request(app)
        .post("/auth/google?method=token")
        .set("Authorization", `Bearer ${google_id_token}`)
        .set("User-Agent", userAgent)
        .send();

      expect(response.status).toBe(httpStatus.OK);
      expect(response.headers["content-type"]).toEqual(
        expect.stringContaining("json")
      );

      const authuser_in_db = await authuserDbService.getAuthUser({
        id: authuser.id,
      });

      expect(authuser_in_db.providers["emailpassword"]).toBe(true);
      expect(authuser_in_db.providers[provider]).toBeDefined();

      TestUtil.CheckTokenConsistency(
        response.body.data.tokens,
        response.body.data.authuser.id
      );

      // check the whole response body expected
      expect(response.body).toEqual({
        success: true,
        data: {
          authuser: {
            id: authuser.id,
            email: google_email,
            isEmailVerified: true,
            isDisabled: false,
            createdAt: expect.any(Number),
            updatedAt: updatedAt, // id did not change
            providers: {
              emailpassword: true,
              [provider]: google_id,
            },
          },
          tokens: TestUtil.ExpectedTokens,
        },
      });

      // check the refresh token is stored into database
      TestUtil.CheckRefreshTokenStoredInDB(response);
    });

    test("should return status 200; return the existing authuser without updating it; if there is an authuser with the same email, registered with: the same auth provider and another auth provider", async () => {
      const updatedAt = 1234567890;
      const google_email = "talat@gmail.com";
      const google_id = "a-google-id-with-some-digits";
      const facebook_id = "a-facebook-id-with-some-digits";

      const existingAuthuserDoc = AuthUser.fromDoc({
        email: google_email,
        password: await bcrypt.hash("Pass1word.", 8),
        isEmailVerified: true,
        updatedAt,
        providers: {
          google: google_id,
          facebook: facebook_id,
        },
      });

      const authuser = await authuserDbService.addAuthUser(existingAuthuserDoc);

      const userAgent = "from-jest-test";

      const provider = "google";
      const google_id_token = crypto.randomBytes(16).toString("hex");

      const customImplementation = () => ({
        provider,
        token: google_id_token,
        expiresIn: 60, // 1m
        user: { id: google_id, email: google_email },
      });

      jest
        .spyOn(authProviders, "google")
        .mockImplementation(customImplementation);

      const response = await request(app)
        .post("/auth/google?method=token")
        .set("Authorization", `Bearer ${google_id_token}`)
        .set("User-Agent", userAgent)
        .send();

      expect(response.status).toBe(httpStatus.OK);
      expect(response.headers["content-type"]).toEqual(
        expect.stringContaining("json")
      );

      const authuser_in_db = await authuserDbService.getAuthUser({
        id: authuser.id,
      });

      expect(authuser_in_db.providers["emailpassword"]).toBeUndefined();
      expect(authuser_in_db.providers["google"]).toBe(google_id);
      expect(authuser_in_db.providers["facebook"]).toBe(facebook_id);

      TestUtil.CheckTokenConsistency(
        response.body.data.tokens,
        response.body.data.authuser.id
      );

      // check the whole response body expected
      expect(response.body).toEqual({
        success: true,
        data: {
          authuser: {
            id: authuser.id,
            email: google_email,
            isEmailVerified: true,
            isDisabled: false,
            createdAt: expect.any(Number),
            updatedAt: updatedAt, // id did not change
            providers: {
              google: google_id,
              facebook: facebook_id,
            },
          },
          tokens: TestUtil.ExpectedTokens,
        },
      });

      // check the refresh token is stored into database
      TestUtil.CheckRefreshTokenStoredInDB(response);
    });
  });
});
