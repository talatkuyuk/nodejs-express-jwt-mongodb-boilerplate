const passport = require("passport");
const httpStatus = require("http-status");

const ApiError = require("../utils/ApiError");
const { traceError } = require("../utils/errorUtils");
const { redisService } = require("../services");

const verifyCallback = (req, resolve, reject) => async (err, pass, info) => {
  try {
    if (err || info) {
      throw new ApiError(httpStatus.UNAUTHORIZED, err || info);
    }

    const { authuser, user, payload } = pass;

    if (!authuser) {
      throw new ApiError(
        httpStatus.UNAUTHORIZED,
        "The access token does not refer any user"
      );
    }

    if (authuser.isDisabled) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "You are disabled, call the system administrator"
      );
    }

    // control if the request is coming from the same useragent - for preventing mitm
    if (req.useragent.source !== payload.ua) {
      throw new ApiError(
        httpStatus.UNAUTHORIZED,
        "Your browser/agent seems changed or updated, you have to re-login"
      );
    }

    // control if The token is blacklisted
    if (await redisService.check_in_blacklist(payload.jti)) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "The access token is blacklisted, you have to re-login"
      );
    }

    req.accesstoken = req.headers.authorization.split(" ")[1];
    req.jti = payload.jti; // the jti will be utilized to revoke the access token
    req.user = user; // the passport may return the user as well
    req.authuser = authuser;

    resolve();
  } catch (error) {
    reject(traceError(error, "AuthenticateMiddleware : verifyCallback"));
  }
};

const authenticate = async (req, res, next) => {
  try {
    await new Promise((resolve, reject) => {
      passport.authenticate(
        "jwt",
        { session: false },
        verifyCallback(req, resolve, reject)
      )(req, res, next);
    });

    next();
  } catch (error) {
    next(traceError(error, "AuthenticateMiddleware : authenticate"));
  }
};

module.exports = authenticate;
