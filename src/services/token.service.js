const jwt = require("jsonwebtoken");
const moment = require("moment");
const crypto = require("crypto");
const httpStatus = require("http-status");

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
 * @param {Moment} expires
 * @param {tokenTypes} type
 * @param {string} jti
 * @param {string} userAgent
 * @param {Moment} notValidBefore
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
  secret = config.jwt.secret
) => {
  try {
    const now = moment().unix();
    const payload = {
      sub: userId,
      iat: now,
      exp: expires.unix(),
      jti,
      ua: userAgent,
      type,
    };
    return jwt.sign(payload, secret, { notBefore: notValidBefore });
  } catch (error) {
    throw traceError(error, "TokenService : generateToken");
  }
};

/**
 * Verify token and return token document (or throw an error if it is not valid)
 * is used only by auth.service (verifyEmail, resetPassword)
 * @param {string} token
 * @param {string} type
 * @returns {Promise<Token>}
 */
const verifyToken = async (token, type) => {
  try {
    const payload = jwt.verify(token, config.jwt.secret);

    const tokenDoc = await tokenDbService.getToken({
      token,
      user: payload.sub,
      type,
    });

    if (!tokenDoc)
      throw new ApiError(httpStatus.UNAUTHORIZED, `the token is not valid`);

    if (tokenDoc.blacklisted)
      throw new ApiError(
        httpStatus.UNAUTHORIZED,
        `the token is in the blacklist`
      );

    return tokenDoc;
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError"
    ) {
      const err = new ApiError(httpStatus.UNAUTHORIZED, error);
      throw traceError(err, "TokenService : verifyToken");
    } else throw traceError(error, "TokenService : verifyToken");
  }
};

/**
 * Establish RTR (Refresh Token Rotation) and return token doc (or throw an error if any security problem)
 * @param {string} token
 * @param {string} userAgent
 * @returns {Promise<Token>}
 */
const refreshTokenRotation = async (refreshToken, userAgent) => {
  // Step-1: control if that RT (Refresh Token) is in DB
  // Step-2: control if that RT is blacklisted
  // Step-3: control if that RT is valid
  // Step-3a: if it is before than notValidBefore time
  // Step-3b: if it is expired
  // Step-4: control if it comes from different user agent

  console.log(`refreshTokenRotation: start`);

  // reachable from both try-catch blocks
  let refreshTokenDoc = null;

  try {
    // Step-1: control if that RT is in DB
    refreshTokenDoc = await tokenDbService.getToken({
      token: refreshToken,
      type: tokenTypes.REFRESH,
    });

    if (!refreshTokenDoc) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "refresh token is not valid");
    }

    // Step-2: control if that RT is blacklisted
    if (refreshTokenDoc.blacklisted) {
      console.log(
        `refreshTokenRotation: ${refreshTokenDoc.id} is in blacklisted`
      );

      // disable the refresh token family
      await disableFamilyRefreshToken(refreshTokenDoc);

      throw new ApiError(
        httpStatus.UNAUTHORIZED,
        "Unauthorized usage of refresh token has been detected"
      );
    }

    const payload = jwt.decode(refreshToken, config.jwt.secret);

    // Step-3: control if it comes from different user agent
    if (payload.ua !== userAgent) {
      console.log(`refreshTokenRotation: userAgent is checked and failed`);

      throw new ApiError(
        httpStatus.UNAUTHORIZED,
        `Your browser/agent seems changed or updated, you have to re-login.`
      );
    }

    // Step-4: control if that RT is valid
    jwt.verify(refreshToken, config.jwt.secret);

    // okey then, success refresh token rotation happened;
    // update the refresh token with the { blacklisted: true }
    await updateTokenAsBlacklisted(refreshTokenDoc.id);

    return refreshTokenDoc;
  } catch (error) {
    console.log(`refreshTokenRotation: in catch error`);

    if (error.name === "NotBeforeError") {
      console.log(`refreshTokenRotation: error.name is NotBeforeError`);

      if (config.jwt.isInvalidRefreshNBT) {
        // Step-3a: if it is before than notValidBefore time,
        // Disable the refresh token family since someone else could use it
        await disableFamilyRefreshToken(refreshTokenDoc);

        error = new ApiError(
          httpStatus.UNAUTHORIZED,
          "Unauthorized usage of refresh token has been detected"
        );
      } else {
        // okey then, success refresh token rotation happened;
        // update the refresh token with the { blacklisted: true }
        await updateTokenAsBlacklisted(refreshTokenDoc.id);

        return refreshTokenDoc;
      }
    }

    if (error.name === "TokenExpiredError") {
      console.log(`refreshTokenRotation: error.name is TokenExpiredError`);

      // Step-3b: if it is expired (means it is not blacklisted and it is the last issued RT)

      // Delete the refresh token family
      await removeTokens({ family: refreshTokenDoc.family });

      // No need to put the related access token into the cached blacklist.

      error = new ApiError(
        httpStatus.UNAUTHORIZED,
        `The refresh token is expired. You have to re-login to get authentication.`
      );
    }

    throw traceError(error, "TokenService : refreshTokenRotation");
  }
};

/**
 * Disable the family of the RT [security problem in RTR (Refresh Token Rotation)] and throw an error
 * @param {Token} refreshTokenDoc
 * @returns {Promise<void>}
 */
const disableFamilyRefreshToken = async (refreshTokenDoc) => {
  try {
    console.log(
      `disableFamilyRefreshToken: ${refreshTokenDoc.id} family: ${refreshTokenDoc.family}`
    );

    // Get refresh token descandents not in the blacklist
    const not_blacklisted_family_member_refresh_tokens =
      await tokenDbService.getTokens({
        family: refreshTokenDoc.family,
        blacklisted: false,
      });

    const size = not_blacklisted_family_member_refresh_tokens?.length ?? 0;
    console.log(
      `disableFamilyRefreshToken: not-blacklisted-family-size: ${size}`
    );

    // if no not-blacklisted, means that whole family was disabled before,
    // and now, whole family should be deleted because the second bad usage happens
    if (size === 0) {
      // Delete the refresh token family
      await removeTokens({ family: refreshTokenDoc.family });

      // No need to put the related access token into the cached blacklist, since it was done before

      // if there is not-blacklisted, means that the security isssue happens the first time
      // and each refresh token should be blacklisted and so related access token should too.
    } else {
      for (tokenRecord of not_blacklisted_family_member_refresh_tokens) {
        console.log(`disableFamilyRefreshToken: in loop: ${tokenRecord.id}`);

        // Update each refresh token with the { blacklisted: true }
        await updateTokenAsBlacklisted(tokenRecord.id);

        // put the related access token's jti into the blacklist
        await redisService.put_into_blacklist("jti", tokenRecord.jti);
      }
    }
  } catch (error) {
    throw traceError(error, "TokenService : disableFamilyRefreshToken");
  }
};

/**
 * Generate auth tokens
 * @param {string} userId
 * @param {string} userAgent
 * @param {string} family
 * @returns {Promise<{ access: Object, refresh: Token }>}
 */
const generateAuthTokens = async (userId, userAgent, family) => {
  try {
    // we will give the same jti to both (access & refresh) to make connection between
    const jti = crypto.randomBytes(16).toString("hex");

    const accessToken = generateAccessToken(userId, userAgent, jti);

    const refreshToken = await generateRefreshToken(
      userId,
      userAgent,
      jti,
      family
    );

    return {
      access: accessToken,
      refresh: refreshToken,
    };
  } catch (error) {
    throw traceError(error, "TokenService : generateAuthTokens");
  }
};

/**
 * Generate access token
 * @param {string} userId
 * @returns {Promise<Object>}
 */
const generateAccessToken = (userId, userAgent, jti) => {
  try {
    const accessTokenExpires = moment().add(
      config.jwt.accessExpirationMinutes,
      "minutes"
    );
    const accessToken = generateToken(
      userId,
      accessTokenExpires,
      tokenTypes.ACCESS,
      jti,
      userAgent
    );
    return { token: accessToken, expires: accessTokenExpires };
  } catch (error) {
    throw traceError(error, "TokenService : generateAccessToken");
  }
};

/**
 * Generate refresh token and save the token document to db
 * @param {string} userId
 * @returns {Promise<Token>}
 */
const generateRefreshToken = async (userId, userAgent, jti, family) => {
  try {
    const refreshTokenExpires = moment().add(
      config.jwt.refreshExpirationDays,
      "days"
    );
    const tokenString = generateToken(
      userId,
      refreshTokenExpires,
      tokenTypes.REFRESH,
      jti,
      userAgent,
      config.jwt.accessExpirationMinutes * 60 // not valid before is 60
    );

    const tokenObject = new Token(
      tokenString,
      userId,
      refreshTokenExpires.toDate(),
      tokenTypes.REFRESH,
      jti,
      family ?? `${userId}-${jti}`
    );

    const refreshToken = await tokenDbService.addToken(tokenObject);

    if (!refreshToken)
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "The database could not process the request"
      );

    return refreshToken;
  } catch (error) {
    throw traceError(error, "TokenService : generateRefreshToken");
  }
};

/**
 * Generate reset password token and save the token document to db
 * @param {string} userId
 * @returns {Promise<Token>}
 */
const generateResetPasswordToken = async (userId) => {
  try {
    const expires = moment().add(
      config.jwt.resetPasswordExpirationMinutes,
      "minutes"
    );
    const tokenString = generateToken(
      userId,
      expires,
      tokenTypes.RESET_PASSWORD
    );

    const tokenObject = new Token(
      tokenString,
      userId,
      expires.toDate(),
      tokenTypes.RESET_PASSWORD
    );

    const resetPasswordToken = await tokenDbService.addToken(tokenObject);

    if (!resetPasswordToken)
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "The database could not process the request"
      );

    return resetPasswordToken;
  } catch (error) {
    throw traceError(error, "TokenService : generateResetPasswordToken");
  }
};

/**
 * Generate verify email token and save the token document to db
 * @param {string} userId
 * @returns {Promise<Token>}
 */
const generateVerifyEmailToken = async (userId) => {
  try {
    const expires = moment().add(
      config.jwt.verifyEmailExpirationMinutes,
      "minutes"
    );
    const tokenString = generateToken(userId, expires, tokenTypes.VERIFY_EMAIL);

    const tokenObject = new Token(
      tokenString,
      userId,
      expires.toDate(),
      tokenTypes.VERIFY_EMAIL
    );

    const verifyEmailToken = await tokenDbService.addToken(tokenObject);

    if (!verifyEmailToken)
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "The database could not process the request"
      );

    return verifyEmailToken;
  } catch (error) {
    throw traceError(error, "TokenService : generateVerifyEmailToken");
  }
};

/**
 * Remove the token with the id and issue report
 * @param {string} id
 * @returns {Promise}
 */
const removeToken = async (id) => {
  try {
    const { isDeleted, deletedCount } = await tokenDbService.deleteToken(id);

    isDeleted
      ? console.log(`${deletedCount} token deleted.`)
      : console.log("No token is deleted.");
  } catch (error) {
    throw traceError(error, "TokenService : removeToken");
  }
};

/**
 * Remove tokens that queried and issue report
 * @param {Object} query
 * @returns {Promise}
 */
const removeTokens = async (query) => {
  try {
    const { isDeleted, deletedCount } = await tokenDbService.deleteTokens(
      query
    );

    isDeleted
      ? console.log(`${deletedCount} token(s) deleted.`)
      : console.log("No token deleted.");
  } catch (error) {
    throw traceError(error, "TokenService : removeTokens");
  }
};

/**
 * Update the token as blacklisted
 * @param {string} id
 * @returns {Promise}
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
 * @returns {Promise}
 */
const findTokenAndRemoveFamily = async (query, command) => {
  try {
    const tokenDoc = await tokenDbService.getToken(query);

    // normally a refresh token can be deleted in only refresh token rotation,
    // any bad usage of refresh token can cause it be deleted
    // TODO: make an analyze here how this situation happen
    if (!tokenDoc)
      throw new ApiError(httpStatus.UNAUTHORIZED, "refresh token is not valid");

    // normally a refresh token can be blacklisted in only refresh token rotation,
    // during the refresh token rotation, access token that paired with refresh token is also blacklisted in cache
    // So, the user who requests the logout can not reach here, but wait !!!
    // what if the redis down during refresh token rotation that causes the refresh token jti is not blacklisted
    // TODO: make a decision here: continue the process and get the user logged out or raise an error
    if (tokenDoc.blacklisted)
      throw new ApiError(
        httpStatus.UNAUTHORIZED,
        "refresh token is in the blacklist"
      );

    if (command === "family") await removeTokens({ family: tokenDoc.family });

    if (command === "user") await removeTokens({ user: tokenDoc.user });
  } catch (error) {
    throw traceError(error, "TokenService : findTokenAndRemoveFamily");
  }
};

module.exports = {
  generateToken,
  verifyToken,
  refreshTokenRotation,
  generateAuthTokens,
  generateAccessToken,
  generateRefreshToken,
  generateResetPasswordToken,
  generateVerifyEmailToken,
  removeToken,
  removeTokens,
  updateTokenAsBlacklisted,
  findTokenAndRemoveFamily,
};
