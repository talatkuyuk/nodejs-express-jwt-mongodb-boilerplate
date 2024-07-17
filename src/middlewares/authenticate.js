/** @typedef {import('../models/authuser.model')} AuthUser */
/** @typedef {import('../models/user.model')} User */

const passport = require("passport");
const httpStatus = require("http-status");

const ApiError = require("../utils/ApiError");
const { traceError } = require("../utils/errorUtils");
const { redisService } = require("../services");

/** @type {import('express').RequestHandler} */
const authenticate = async (req, res, next) => {
  try {
    await new Promise((resolve, reject) => {
      passport.authenticate(
        "jwt",
        { session: false },

        /**
         * @typedef {Object} Pass
         * @property {AuthUser} authuser - The authuser property.
         * @property {User} user - The user property.
         * @property {import('jsonwebtoken').JwtPayload} payload - The payload property.
         *
         * see parameters of {import('passport').AuthenticateCallback}
         *
         * @param {any} err
         * @param {Pass | false} pass
         * @param {object | string | Array<string | undefined>} info
         */
        async (err, pass, info) => {
          try {
            console.log("in authenticate callback");

            if (err || info) {
              throw new ApiError(httpStatus.UNAUTHORIZED, err || info);
            }

            console.log("in authenticate middleware");
            console.log({ pass });

            if (pass === undefined) {
              throw new ApiError(
                httpStatus.UNAUTHORIZED,
                "Something went wrong in authorization process",
              );
            }

            if (pass === false) {
              throw new ApiError(
                httpStatus.UNAUTHORIZED,
                "The access token does not refer any user",
              );
            }
            const { authuser, user, payload } = pass;

            if (!authuser) {
              throw new ApiError(
                httpStatus.UNAUTHORIZED,
                "The access token does not refer any user",
              );
            }

            if (authuser.isDisabled) {
              throw new ApiError(
                httpStatus.FORBIDDEN,
                "You are disabled, call the system administrator",
              );
            }

            // control if the request is coming from the same useragent - for preventing mitm
            if (req.useragent?.source !== payload.ua) {
              throw new ApiError(
                httpStatus.UNAUTHORIZED,
                "Your browser/agent seems changed or updated, you have to re-login",
              );
            }

            // control if The token is blacklisted
            if (await redisService.check_in_blacklist(payload.jti)) {
              throw new ApiError(
                httpStatus.FORBIDDEN,
                "The access token is blacklisted, you have to re-login",
              );
            }

            req.accesstoken = req.headers.authorization?.split(" ")[1] ?? "";
            req.jti = payload.jti ?? ""; // the jti will be utilized to revoke the access token
            req.user = user; // the passport may return the user as well
            req.authuser = authuser;

            resolve(undefined);
          } catch (error) {
            reject(traceError(error, "AuthenticateMiddleware : verifyCallback"));
          }
        },
      )(req, res, next);
    });

    next();
  } catch (error) {
    next(traceError(error, "AuthenticateMiddleware : authenticate"));
  }
};

module.exports = authenticate;
