const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const { Strategy: BearerStrategy } = require("passport-http-bearer");

const config = require("../config");
const { tokenTypes } = require("../config/tokens");
const { traceError } = require("../utils/errorUtils");
const { authProviders, joinedDbService } = require("../services");

//****----------------------------------------------

/** @type {import('passport-jwt').VerifyCallbackWithRequest} */
const jwtVerifyCallbackWithRequest = async (_req, payload, done) => {
  try {
    console.log("in passport middleware");
    console.log({ payloadInPassport: payload });

    if (payload.type !== tokenTypes.ACCESS) {
      throw new Error("Invalid token type");
    }

    // Below, fetchs only the authuser without the related user from mongoDb
    // const authuser = await authuserDbService.getAuthUser({ id: payload.sub });

    // Below, fetchs authuser and user via a left outer join query in mongoDb
    const { authuser, user } = await joinedDbService.getAuthUserJoined(
      /** @type {string} */ (payload.sub),
    );

    console.log("in passport middleware");
    console.log({ authuser, user });

    if (!authuser) return done(null, false);

    done(null, { authuser, user, payload });
  } catch (error) {
    done(traceError(error, "Passport : jwtVerifyCallback"));
  }
};

/** @type {import('passport-jwt').StrategyOptionsWithRequest} */
const jwtStrategyOptionsWithRequest = {
  passReqToCallback: true,
  secretOrKey: config.jwt.secret,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
};

const jwtStrategy = new JwtStrategy(
  jwtStrategyOptionsWithRequest,
  jwtVerifyCallbackWithRequest,
);

//****---------------------------------------------

/**
 * oAuth strategy is simply a BaererStrategy, so the token is extracted from req.headers by passport
 *
 * @param {"google" | "facebook"} provider
 * @returns {import('passport-jwt').VerifyCallbackWithRequest}
 */
const oAuthVerifyCallback = (provider) => async (req, token, done) => {
  try {
    const method = req.query.method; // for google --> "token" (idToken) | "code" (authorization code)

    /** @type {import("../services/authProviders").AuthProviderResult} */
    const oAuth = await authProviders[provider](token, method);

    return done(null, oAuth);
  } catch (error) {
    done(traceError(error, "Passport : oAuthVerifyCallback"));
  }
};

/** @type {import('passport-http-bearer').IStrategyOptions} */
const bearerStrategyOptions = {
  passReqToCallback: true,
};

const googleStrategy = new BearerStrategy(bearerStrategyOptions, oAuthVerifyCallback("google"));
const facebookStrategy = new BearerStrategy(
  bearerStrategyOptions,
  oAuthVerifyCallback("facebook"),
);

//****-------------------------------------------

module.exports = {
  jwtStrategy,
  googleStrategy,
  facebookStrategy,
};
