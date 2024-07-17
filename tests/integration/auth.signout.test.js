const request = require("supertest");
const httpStatus = require("http-status");
const jwt = require("jsonwebtoken");

const app = require("../../src/core/express");

const { authuserDbService, tokenDbService, redisService } = require("../../src/services");
const { tokenTypes } = require("../../src/config/tokens");

const TestUtil = require("../testutils/TestUtil");

const { setupTestDatabase } = require("../setup/setupTestDatabase");
const { setupRedis } = require("../setup/setupRedis");

setupTestDatabase();
setupRedis();

describe("POST /auth/signout", () => {
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

  // Since the process of signout is the same with logout mostly, especially considering failures;
  // It is enough here to test only success signout

  describe("Success signout", () => {
    test("should return 204, remove refresh token of the authuser from db and revoke access tokens", async () => {
      // add a token into db for the user, to make further expect is more reasonable related with removal the user's whole tokens.
      await tokenDbService.addToken({
        token: "no-matter-for-this-test",
        user: authuserId,
        type: tokenTypes.VERIFY_EMAIL,
        expires: new Date(new Date().getTime() + 10 * 60000),
      });

      const response = await request(app)
        .post("/auth/signout")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("User-Agent", userAgent)
        .send();

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body.success).toBe(true);

      // check the access token of the authuser is in the blacklist
      const payload = jwt.decode(accessToken, { json: true });
      if (!payload) throw new Error("Unexpected error while decoding access token");
      const result = await redisService.check_in_blacklist(payload.jti);
      expect(result).toBe(true);

      // check the authuser's whole tokens and are removed from db
      const data = await tokenDbService.getTokens({ user: authuserId });
      expect(data.length).toBe(0);

      // check the authuser is removed from authuser collection in db
      const data1 = await authuserDbService.getAuthUser({ id: authuserId });
      expect(data1).toBeNull();

      // check the authuser is moved to deleted authuser collection in db
      const data2 = await authuserDbService.getDeletedAuthUser({
        id: authuserId,
      });

      expect(data2).not.toBeNull();

      if (data2) expect(data2.deletedAt).not.toBeNull();
    });
  });
});
