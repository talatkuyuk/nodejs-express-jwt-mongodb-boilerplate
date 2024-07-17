/** @typedef {import('express').RequestHandler} RequestHandler */

const passport = require("passport");
const httpStatus = require("http-status");

const ApiError = require("../utils/ApiError");
const { traceError } = require("../utils/errorUtils");
const { redisService } = require("../services");

// The Strategies which is related with the "provider" are registered into the passport in express(app),
// and the strategy is going to be processed in the passport oAuthVerify, considering the "provider"

/**
 *
 * @param {import('../services/authProviders').AuthProvider} provider
 * @returns {RequestHandler}
 */
const oAuth = (provider) => async (req, res, next) => {
  return new Promise((resolve, reject) => {
    passport.authenticate(
      provider,
      { session: false },
      /**
       * see parameters of {import('passport').AuthenticateCallback}
       *
       * @param {any} err
       * @param {import('../services/authProviders').AuthProviderResult} oAuth
       * @param {object | string | Array<string | undefined>} info
       */
      async function (err, oAuth, info) {
        try {
          if (err) {
            if (
              ["ENOTFOUND", "socket", "connection", "ECONNRESET"].some((el) =>
                err.message?.includes(el),
              )
            )
              err.message = "Auth provider connection error occured, try later";
            throw new ApiError(httpStatus.UNAUTHORIZED, err);
          }

          if (info) {
            if (typeof info === "string")
              throw new ApiError(
                httpStatus.BAD_REQUEST,
                `Badly formed Authorization Header with Bearer. [${info}]`,
              );

            if (info instanceof Error) throw new ApiError(httpStatus.BAD_REQUEST, info);
          }

          if (!oAuth) {
            throw new ApiError(
              httpStatus.BAD_REQUEST,
              "Badly formed Authorization Header with Bearer",
            );
          }

          if (!oAuth.identity.id) {
            throw new ApiError(
              httpStatus.UNAUTHORIZED,
              `${provider} authentication could not be associated with any identification`,
            );
          }

          if (!oAuth.identity.email) {
            throw new ApiError(
              httpStatus.UNAUTHORIZED,
              `${provider} authentication does not contain necessary email information`,
            );
          }

          // control if the authProvider's token is in the blacklist
          if (await redisService.check_in_blacklist(oAuth.token)) {
            throw new ApiError(
              httpStatus.FORBIDDEN,
              `The ${provider} token is blacklisted, you have to re-login`,
            );
          }

          // if everything is okey, then put the token into the blacklist aiming one-shot usage
          // this time we put the token itself not jti, since all authProviders' tokens does not contain a jti claim
          await redisService.put_token_into_blacklist(oAuth.token, oAuth.expiresIn);

          req.oAuth = oAuth;

          resolve(undefined);
        } catch (error) {
          reject(traceError(error, "oAuthMiddleware : oAuth(callback)"));
        }
      },
    )(req, res, next);
  })
    .then(() => next())
    .catch((error) => {
      next(traceError(error, "AuthMiddleware : oAuth"));
    });
};

module.exports = oAuth;
