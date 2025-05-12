/** @typedef {import('jsonwebtoken').SignOptions} SignOptions */
/** @typedef {import('../models/token.model')} Token */

const jwt = require("jsonwebtoken");
const moment = require("moment");
const crypto = require("crypto");
const { status: httpStatus } = require("http-status");

const config = require("../config");

const ApiError = require("../utils/ApiError");
const { traceError } = require("../utils/errorUtils");
const { Token } = require("../models");
const { tokenTypes } = require("../config/tokens");

const tokenDbService = require("./token.db.service");
const redisService = require("./redis.service");

// TOKEN MECHANIZM
// When log in, send 2 tokens (Access token, Refresh token) in response to the client.
// The Access Token will have less expiry time and Refresh Token will have long expiry time.
// The client (Front end) will store Access Token in cookies.
// The client (Front end) will store Refresh Token in his local storage.
// The client will use an access token for calling APIs. But when it expires, pick the refresh token from local storage and call auth server API to get the new token.
// Auth server will have an API exposed which will accept refresh token and checks for its validity and return a new access token.
// Once the refresh token is expired, the User will be logged out.

/**
 * Generate token
 * @param {string} userId
 * @param {moment.Moment} expires
 * @param {import('../config/tokens').TokenType} type
 * @param {string} [jti]
 * @param {string} [userAgent]
 * @param {SignOptions["notBefore"]} [notValidBefore]
 * @param {string} [secret]
 * @returns {string}
 */
const generateToken = (
  userId,
  expires,
  type,
  jti = "n/a",
  userAgent = "n/a",
  notValidBefore = 0,
  secret = config.jwt.secret,
) => {
  try {
    const now = moment().unix();
    const payload = { sub: userId, iat: now, exp: expires.unix(), jti, ua: userAgent, type };
    return jwt.sign(payload, secret, { notBefore: notValidBefore });
  } catch (error) {
    throw traceError(error, "TokenService : generateToken");
  }
};

/**
 * Verify token and return token document (or throw an error if it is not valid)
 * is used only by auth.service (verifyEmail, resetPassword)
 * @param {string} token
 * @param {import('../config/tokens').TokenType} type
 * @returns {Promise<Token>}
 */
const verifyToken = async (token, type) => {
  try {
    const payload = jwt.verify(token, config.jwt.secret);

    if (typeof payload === "string") {
      throw new ApiError(httpStatus.UNAUTHORIZED, "The token is valid but couldn't verified");
    }

    const tokenInstance = await tokenDbService.getToken({ token, user: payload.sub, type });

    if (!tokenInstance) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "The token is not valid");
    }

    if (tokenInstance.blacklisted) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "The token is blacklisted");
    }

    return tokenInstance;
  } catch (error) {
    let err = error;

    if (
      error instanceof Error &&
      (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError")
    ) {
      err = new ApiError(httpStatus.UNAUTHORIZED, error);
    }

    throw traceError(err, "TokenService : verifyToken");
  }
};

/**
 * Control if refresh token is in DB and get token instance
 * @param {string} refreshTokenString
 * @returns {Promise<Token>}
 */
const getRefreshToken = async (refreshTokenString) => {
  try {
    const refreshToken = await tokenDbService.getToken({
      token: refreshTokenString,
      type: tokenTypes.REFRESH,
    });

    if (!refreshToken) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "The refresh token is not valid");
    }

    return refreshToken;
  } catch (error) {
    throw traceError(error, "TokenService : getRefreshToken");
  }
};

/**
 * Establish RTR (Refresh Token Rotation) and return token doc (or throw an error if any security problem)
 * @param {Token} refreshToken
 * @param {string} [userAgent]
 * @returns {Promise<void>}
 */
const refreshTokenRotation = async (refreshToken, userAgent) => {
  // Step-1: control if that RT (Refresh Token) is in DB (done with getRefreshToken)
  // Step-2: control if that RT is blacklisted
  // Step-3: control if that RT is valid
  // Step-3a: if it is before than notValidBefore time
  // Step-3b: if it is expired
  // Step-4: control if it comes from different user agent

  try {
    console.log(`refreshTokenRotation: start`);

    // Step-2: control if that RT is blacklisted
    if (refreshToken.blacklisted) {
      console.log(`refreshTokenRotation: ${refreshToken.id} is in blacklisted`);

      console.log(`refreshTokenRotation: disable family refreshtoken for ${refreshToken.id}`);

      // disable refresh token family including current
      await disableFamilyRefreshToken(refreshToken.family);

      throw new ApiError(httpStatus.UNAUTHORIZED, "The refresh token is blacklisted");
    }

    /**************** USERAGENT CONTROL SECTION **************/

    const payload = jwt.decode(refreshToken.token, { json: true });

    if (!payload) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "The refresh token couldn't be decoded");
    }

    // Step-3: control if it comes from different user agent
    if (payload.ua !== userAgent) {
      console.log(`refreshTokenRotation: userAgent is checked and failed`);

      throw new ApiError(
        httpStatus.UNAUTHORIZED,
        "Your browser/agent seems changed or updated, you have to re-login",
      );
    }

    /**************** MAIN VERIFICATION SECTION **************/

    // Step-4: control if that RT is valid
    jwt.verify(refreshToken.token, config.jwt.secret);

    // okey then, success refresh token rotation happened;
    // update the refresh token with the { blacklisted: true }
    await updateTokenAsBlacklisted(refreshToken.id);

    // make current refresh token is blacklisted as well
    refreshToken.blacklisted = true;
  } catch (error) {
    console.log(`refreshTokenRotation: in catch error`);

    let err = error;

    if (error instanceof Error && error.name === "NotBeforeError") {
      console.log(`refreshTokenRotation: The error is NotBeforeError`);

      if (config.jwt.isInvalidRefreshNBT) {
        // Step-3a: if it is before than notValidBefore time,
        // Disable the refresh token family since someone else could use it
        console.log(`refreshTokenRotation: disable family refreshtoken for ${refreshToken.id}`);

        await disableFamilyRefreshToken(refreshToken.family);

        err = new ApiError(
          httpStatus.UNAUTHORIZED,
          "Unauthorized usage of refresh token has been detected",
        );
      } else {
        // okey then, success refresh token rotation happened;
        // update the refresh token with the { blacklisted: true }
        await updateTokenAsBlacklisted(refreshToken.id);

        // make current refresh token is blacklisted as well
        refreshToken.blacklisted = true;
      }
    }

    if (error instanceof Error && error.name === "TokenExpiredError") {
      console.log("refreshTokenRotation: The error is TokenExpiredError");

      // Step-3b: if it is expired (means it is not blacklisted and it is the last issued RT)

      // Delete the refresh token family
      await removeTokens({ family: refreshToken.family });

      // No need to put the related access token into the cached blacklist.

      err = new ApiError(
        httpStatus.UNAUTHORIZED,
        "The refresh token is expired, you have to re-login",
      );
    }

    throw traceError(err, "TokenService : refreshTokenRotation");
  }
};

/**
 * Disable the family of the RT [security problem in RTR (Refresh Token Rotation)] and throw an error
 * @param {string} family
 * @returns {Promise<void>}
 */
const disableFamilyRefreshToken = async (family) => {
  try {
    console.log(`disableFamilyRefreshToken: family: ${family}`);

    // Get refresh token descandents not in the blacklist
    const not_blacklisted_family_member_refresh_tokens = await tokenDbService.getTokens({
      family,
      blacklisted: false,
    });

    const size = not_blacklisted_family_member_refresh_tokens?.length ?? 0;
    console.log(`disableFamilyRefreshToken: not-blacklisted-family-size: ${size}`);

    // if no not-blacklisted, means that whole family was disabled before,
    // and now, whole family should be deleted because the second bad usage happens
    if (size === 0) {
      // Delete the refresh token family
      await removeTokens({ family });

      // No need to put the related access token into the cached blacklist, since it was done before

      // if there is not-blacklisted, means that the security isssue happens the first time
      // and each refresh token should be blacklisted and so related access token should too.
    } else {
      for (const tokenRecord of not_blacklisted_family_member_refresh_tokens) {
        console.log(`disableFamilyRefreshToken: in loop: ${tokenRecord.id}`);

        // Update each refresh token with the { blacklisted: true }
        await updateTokenAsBlacklisted(tokenRecord.id);

        // put the related access token's jti into the blacklist
        await redisService.put_jti_into_blacklist(tokenRecord.jti);
      }
    }
  } catch (error) {
    throw traceError(error, "TokenService : disableFamilyRefreshToken");
  }
};

/**
 * Generate auth tokens
 * @typedef {Object} TokenResult
 * @property {string} token
 * @property {string} expires
 *
 * @typedef {Object} AuthTokens
 * @property {TokenResult} access
 * @property {TokenResult} refresh
 *
 * @param {string} userId
 * @param {string} [userAgent]
 * @param {string} [family]
 * @returns {Promise<AuthTokens>}
 */
const generateAuthTokens = async (userId, userAgent, family) => {
  try {
    // we will give the same jti to both (access & refresh) to make connection between
    const jti = crypto.randomBytes(16).toString("hex");

    const accessToken = generateAccessToken(userId, userAgent, jti);

    const refreshToken = await generateRefreshToken(userId, userAgent, jti, family);

    return {
      access: { token: accessToken.token, expires: accessToken.expires },
      refresh: { token: refreshToken.token, expires: refreshToken.expires.toISOString() },
    };
  } catch (error) {
    throw traceError(error, "TokenService : generateAuthTokens");
  }
};

/**
 * Generate access token, it returns different than others, don't returns Token instance
 * @param {string} userId
 * @param {string} [userAgent]
 * @param {string} [jti]
 * @returns {TokenResult}
 */
const generateAccessToken = (userId, userAgent, jti) => {
  try {
    const expires = moment().add(config.jwt.accessExpirationMinutes, "minutes");

    const tokenString = generateToken(userId, expires, tokenTypes.ACCESS, jti, userAgent);

    return { token: tokenString, expires: expires.toISOString() };
  } catch (error) {
    throw traceError(error, "TokenService : generateAccessToken");
  }
};

/**
 * Generate refresh token, save the token document into db and returns the Token instance
 * @param {string} userId
 * @param {string} [userAgent]
 * @param {string} [jti]
 * @param {string} [family]
 * @returns {Promise<Token>}
 */
const generateRefreshToken = async (userId, userAgent, jti, family) => {
  try {
    const expires = moment().add(config.jwt.refreshExpirationDays, "days");

    const tokenString = generateToken(
      userId,
      expires,
      tokenTypes.REFRESH,
      jti,
      userAgent,
      config.jwt.accessExpirationMinutes * 60, // not valid before is 60
    );

    const refreshToken = await tokenDbService.addToken({
      token: tokenString,
      user: userId,
      expires: expires.toDate(),
      type: tokenTypes.REFRESH,
      jti: jti ?? "n/a",
      family: family ?? `${userId}-${jti}`,
      blacklisted: false,
    });

    if (!refreshToken) {
      throw new ApiError(httpStatus.BAD_REQUEST, "The database could not process the request");
    }

    return refreshToken;
  } catch (error) {
    throw traceError(error, "TokenService : generateRefreshToken");
  }
};

/**
 * Generate reset password token, save the token document into db and returns the Token instance
 * @param {string} userId
 * @returns {Promise<Token>}
 */
const generateResetPasswordToken = async (userId) => {
  try {
    const expires = moment().add(config.jwt.resetPasswordExpirationMinutes, "minutes");

    const tokenString = generateToken(userId, expires, tokenTypes.RESET_PASSWORD);

    /** @type {import("./token.db.service").TokenFields} */
    const tokenObject = {
      token: tokenString,
      user: userId,
      expires: expires.toDate(),
      type: tokenTypes.RESET_PASSWORD,
    };

    const resetPasswordToken = await tokenDbService.addToken(tokenObject);

    if (!resetPasswordToken) {
      throw new ApiError(httpStatus.BAD_REQUEST, "The database could not process the request");
    }

    return resetPasswordToken;
  } catch (error) {
    throw traceError(error, "TokenService : generateResetPasswordToken");
  }
};

/**
 * Generate verify email token, save the token document into db and returns the Token instance
 * @param {string} userId
 * @returns {Promise<Token>}
 */
const generateVerifyEmailToken = async (userId) => {
  try {
    const expires = moment().add(config.jwt.verifyEmailExpirationMinutes, "minutes");

    const tokenString = generateToken(userId, expires, tokenTypes.VERIFY_EMAIL);

    /** @type {import("./token.db.service").TokenFields} */
    const tokenObject = {
      token: tokenString,
      user: userId,
      expires: expires.toDate(),
      type: tokenTypes.VERIFY_EMAIL,
    };

    const verifyEmailToken = await tokenDbService.addToken(tokenObject);

    if (!verifyEmailToken)
      throw new ApiError(httpStatus.BAD_REQUEST, "The database could not process the request");

    return verifyEmailToken;
  } catch (error) {
    throw traceError(error, "TokenService : generateVerifyEmailToken");
  }
};

/**
 * Generate verify signup token, save the token document into db and returns the Token instance
 * @param {string} userId
 * @returns {Promise<Token>}
 */
const generateVerifySignupToken = async (userId) => {
  try {
    const expires = moment().add(config.jwt.verifySignupExpirationMinutes, "minutes");

    const tokenString = generateToken(userId, expires, tokenTypes.VERIFY_SIGNUP);

    /** @type {import("./token.db.service").TokenFields} */
    const tokenObject = {
      token: tokenString,
      user: userId,
      expires: expires.toDate(),
      type: tokenTypes.VERIFY_SIGNUP,
    };

    const verifySignupToken = await tokenDbService.addToken(tokenObject);

    if (!verifySignupToken)
      throw new ApiError(httpStatus.BAD_REQUEST, "The database could not process the request");

    return verifySignupToken;
  } catch (error) {
    throw traceError(error, "TokenService : generateVerifySignupToken");
  }
};

/**
 * Remove the token with the id and issue report
 * @param {string} id
 * @returns {Promise<void>}
 */
const removeToken = async (id) => {
  try {
    await tokenDbService.deleteToken(id);
  } catch (error) {
    throw traceError(error, "TokenService : removeToken");
  }
};

/**
 * Remove tokens that queried and issue report
 * @typedef {Object} TokenFields
 * @property {Token["token"]} [token]
 * @property {Token["user"]} [user]
 * @property {Token["expires"]} [expires]
 * @property {Token["type"]} [type]
 * @property {Token["jti"]} [jti]
 * @property {Token["family"]} [family]
 * @property {Token["blacklisted"]} [blacklisted]
 *
 * @param {TokenFields} query
 * @returns {Promise<void>}
 */
const removeTokens = async (query) => {
  try {
    await tokenDbService.deleteTokens(query);
  } catch (error) {
    throw traceError(error, "TokenService : removeTokens");
  }
};

/**
 * Update the token as blacklisted
 * @param {string} id
 * @returns {Promise<void>}
 */
const updateTokenAsBlacklisted = async (id) => {
  try {
    await tokenDbService.updateToken(id, { blacklisted: true });
  } catch (error) {
    throw traceError(error, "TokenService : updateTokenAsBlacklisted");
  }
};

/**
 * Find the token and remove family's token or user's tokens according to command option
 * @param {Object} query
 * @param {string} command
 * @returns {Promise<void>}
 */
const findTokenAndRemoveFamily = async (query, command) => {
  try {
    const tokenDoc = await tokenDbService.getToken(query);

    // normally a refresh token can be deleted in only refresh token rotation,
    // any bad usage of refresh token can cause it be deleted
    // TODO: make an analyze here how this situation happen
    if (!tokenDoc)
      throw new ApiError(httpStatus.UNAUTHORIZED, "The refresh token is not valid");

    // normally a refresh token can be blacklisted in only refresh token rotation,
    // during the refresh token rotation, access token that paired with refresh token is also blacklisted in cache
    // So, the user who requests the logout can not reach here, but wait !!!
    // what if the redis down during refresh token rotation that causes the refresh token jti is not blacklisted
    // TODO: make a decision here: continue the process and get the user logged out or raise an error
    if (tokenDoc.blacklisted)
      throw new ApiError(httpStatus.UNAUTHORIZED, "The refresh token is blacklisted");

    if (command === "family") await removeTokens({ family: tokenDoc.family });

    if (command === "user") await removeTokens({ user: tokenDoc.user });
  } catch (error) {
    throw traceError(error, "TokenService : findTokenAndRemoveFamily");
  }
};

/**
 *
 * @param {import('../config/tokens').TokenType} type
 * @param {string} [expiresInString]
 * @param {string} [userId]
 * @param {string} [userAgent]
 * @param {number} [nvb]
 * @param {string} [jti]
 * @param {string} [secret]
 * @returns
 */
const generateTokenForTest = (
  type,
  expiresInString = "1 days",
  userId = "123456789012345678901234",
  userAgent = "n/a",
  nvb = 0, // minutes
  jti = "n/a",
  secret = config.jwt.secret,
) => {
  try {
    const interval = /** @type {moment.DurationInputArg1} */ (
      Number(expiresInString.split(" ")[0])
    );

    const durationString = /** @type {moment.DurationInputArg2} */ (
      expiresInString.split(" ")[1]
    );

    const expires = moment().add(interval, durationString);

    const payload = {
      sub: userId,
      iat: moment().unix(),
      exp: expires.unix(),
      jti,
      ua: userAgent,
      type,
    };

    console.log(payload);

    const token = jwt.sign(payload, secret, { notBefore: nvb });

    console.log(token);

    return token;
  } catch (error) {
    throw traceError(error, "TokenService : generateTokenForTest");
  }
};

module.exports = {
  generateToken,
  verifyToken,
  getRefreshToken,
  refreshTokenRotation,
  generateAuthTokens,
  generateAccessToken,
  generateRefreshToken,
  generateResetPasswordToken,
  generateVerifyEmailToken,
  generateVerifySignupToken,
  removeToken,
  removeTokens,
  updateTokenAsBlacklisted,
  findTokenAndRemoveFamily,
  generateTokenForTest,
};
