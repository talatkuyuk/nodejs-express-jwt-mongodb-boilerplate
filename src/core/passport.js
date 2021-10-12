const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const BearerStrategy = require('passport-http-bearer').Strategy;

const config = require('../config');
const { tokenTypes } = require('../config/tokens');
const { locateError } = require('../utils/ApiError');
const { authuserDbService, authProviders } = require('../services');


const jwtVerify = async (payload, done) => {
	try {
		if (payload.type !== tokenTypes.ACCESS) {
			throw new Error('Invalid token type');
		}

		const authuser = await authuserDbService.getAuthUser({ id: payload.sub });

		if (!authuser) return done(null, false);
		
		done(null, { authuser, payload });

	} catch (error) {
		done( locateError(error, "Passport : jwtVerify") );
	}
};

const oAuthVerify = (service) => async (req, token, done) => {
	try {
	  const oAuth = await authProviders[service](token);

	  if (!oAuth && !oAuth.user) return done(null, false, { message: `${service} oAuth token error occured.` });
	  if (!oAuth.user.email) return done(null, false, { message: `Check ${service} oAuth scope consists e-mail.` });

	  req.oAuth = oAuth;
	  
	  return done(null, oAuth.user);

	} catch (error) {
		done( locateError(error, "Passport : oAuthVerify") );
	}
};


const jwtOptions = {
	secretOrKey: config.jwt.secret,
	jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
};

const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);



const oAuthOptions = {
	passReqToCallback: true
};

const googleStrategy = new BearerStrategy(oAuthOptions, oAuthVerify('google'));
const facebookStrategy = new BearerStrategy(oAuthOptions, oAuthVerify('facebook'));


module.exports = {
	jwtStrategy,
	googleStrategy,
	facebookStrategy
};
