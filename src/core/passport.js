const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const BearerStrategy = require('passport-http-bearer').Strategy;

const config = require('../config');
const { tokenTypes } = require('../config/tokens');
const { locateError } = require('../utils/ApiError');
const { authProviders, joinedDbService } = require('../services');


const jwtVerify = async (req, payload, done) => {
	try {
		if (payload.type !== tokenTypes.ACCESS) {
			throw new Error('Invalid token type');
		}

		// Below, fetchs only the authuser without the related user from mongoDb
		// const authuser = await authuserDbService.getAuthUser({ id: payload.sub });

		// Below, fetchs authuser and user via a left outer join query in mongoDb
		const { authuser, user } = await joinedDbService.getAuthUserJoined(payload.sub);

		if (!authuser) return done(null, false);

		done(null, { authuser, user, payload });

	} catch (error) {
		done( locateError(error, "Passport : jwtVerify") );
	}
};


// oAuth strategy is simply a BaererStrategy, so the token is extracted from req.headers by passport
const oAuthVerify = (service) => async (req, token, done) => {
	try {

		const oAuth = await authProviders[service](token);

		// oAuth object schema --> { provider, token, expires, user: { id, email } }
		
		return done(null, oAuth);

	} catch (error) {
		done( locateError(error, "Passport : oAuthVerify") );
	}
};

//****----------------------------------------------

const jwtOptions = {
	passReqToCallback: true,
	secretOrKey: config.jwt.secret,
	jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
};

const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);

//****---------------------------------------------

const oAuthOptions = {
	passReqToCallback: true
};

const googleStrategy = new BearerStrategy(oAuthOptions, oAuthVerify('google'));
const facebookStrategy = new BearerStrategy(oAuthOptions, oAuthVerify('facebook'));

//****-------------------------------------------

module.exports = {
	jwtStrategy,
	googleStrategy,
	facebookStrategy
};
