const jwt = require("jsonwebtoken");
const httpStatus = require("http-status");
const moment = require("moment");

const { tokenService, tokenDbService, authuserDbService } = require("../../src/services");
const { tokenTypes } = require("../../src/config/tokens");
const ApiError = require("../../src/utils/ApiError");

class TestUtil {
  /**
   * CheckTokenConsistency
   * @param {import("../../src/services/token.service").AuthTokens} tokens
   * @param {string} id
   * @returns {void}
   */
  static CheckTokenConsistency = (tokens, id) => {
    const accessToken = tokens.access.token;
    const refreshToken = tokens.refresh.token;

    const accessExpiration = tokens.access.expires;
    const refreshExpiration = tokens.refresh.expires;

    // access token verification and consistency check within the data
    const payload = jwt.decode(accessToken, { json: true });

    if (!payload) {
      expect(payload).not.toBeNull();
      return;
    }

    const { sub, iat, exp, jti, type } = payload;

    expect(sub && iat && exp && jti && type).toBe(tokenTypes.ACCESS);
    expect(sub).toBe(id);
    expect(exp).toBe(moment(accessExpiration).unix());

    // refresh token verification and consistency check within the data
    const payload2 = jwt.decode(refreshToken, { json: true });

    if (!payload2) {
      expect(payload2).not.toBeNull();
      return;
    }

    const { sub: subx, iat: iatx, exp: expx, jti: jtix, type: typex } = payload2;

    expect(subx && iatx && expx && jtix && typex).toBe(tokenTypes.REFRESH);
    expect(subx).toBe(id);
    expect(expx).toBe(moment(refreshExpiration).unix());

    expect(moment(accessExpiration, moment.ISO_8601, true).isValid()).toBe(true);
    expect(moment(refreshExpiration, moment.ISO_8601, true).isValid()).toBe(true);
  };

  static ExpectedTokens = {
    access: {
      token: expect.any(String),
      expires: expect.any(String), // ex. "2021-10-17T09:49:26.735Z"
    },
    refresh: {
      token: expect.any(String),
      expires: expect.any(String),
    },
  };

  /**
   * CheckRefreshTokenStoredInDB
   * @param {import('supertest').Response} response
   * @returns {Promise<void>}
   */
  static CheckRefreshTokenStoredInDB = async (response) => {
    // check the refresh token is stored into database
    const tokenDoc = await tokenDbService.getToken({
      user: response.body.data.authuser.id,
      token: response.body.data.tokens.refresh.token,
      expires: moment(response.body.data.tokens.refresh.expires).toDate(),
      type: tokenTypes.REFRESH,
    });
    expect(tokenDoc?.id).toBeDefined();
  };

  /**
   * errorExpectations
   * @param {import('supertest').Response} response
   * @param {number} status
   * @returns {void}
   */
  static errorExpectations = (response, status) => {
    expect(response.status).toBe(status);
    expect(response.headers["content-type"]).toEqual(expect.stringContaining("json"));
    expect(response.body.success).toBe(false);
    expect(response.body).not.toHaveProperty("data");
    expect(response.body).toHaveProperty("error");
    expect(response.body.error.code).toEqual(status);
    expect(response.body.error).toHaveProperty("errorPath");
    expect(response.body.error).not.toHaveProperty("errors");
  };

  /**
   * validationErrorExpectations
   * @param {import('supertest').Response} response
   * @returns {void}
   */
  static validationErrorExpectations = (response) => {
    expect(response.status).toBe(httpStatus.UNPROCESSABLE_ENTITY);
    expect(response.headers["content-type"]).toEqual(expect.stringContaining("json"));
    expect(response.body.success).toBe(false);
    expect(response.body).not.toHaveProperty("data");
    expect(response.body.error.code).toEqual(422);
    expect(response.body.error.name).toEqual("ValidationError");
    expect(response.body.error.message).toEqual("The request could not be validated");
    expect(response.body.error).not.toHaveProperty("errorPath");
  };

  /**
   * validationErrorInMiddleware
   * @param {ApiError} err
   * @returns {void}
   */
  static validationErrorInMiddleware = (err) => {
    expect(err.statusCode).toBe(422);
    expect(err.name).toBe("ValidationError");
    expect(err.message).toEqual("The request could not be validated");
    expect(err.errorPath).toBeNull();
  };

  /**
   * createAuthUser
   * @param {string} userAgent
   * @param {import("../../src/services/authuser.db.service").AuthuserFieldsForCreate} authuserObject
   * @returns
   */
  static createAuthUser = async (userAgent, authuserObject) => {
    const authuser = await authuserDbService.addAuthUser(authuserObject);

    if (!authuser) {
      throw Error("Unexpected fail in db operation while adding an authuser");
    }

    const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);

    return { authuser, tokens };
  };
}

module.exports = TestUtil;
