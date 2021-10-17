const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const BearerStrategy = require('passport-http-bearer').Strategy;

const config = require('../config');
const { tokenTypes } = require('../config/tokens');
const { locateError } = require('../utils/ApiError');
const { authProviders, joinedDbService } = require('../services');


const jwtVerify = async (payload, done) => {
	try {
		if (payload.type !== tokenTypes.ACCESS) {
			throw new Error('Invalid token type');
		}

		// Below, was only fetched the authuser without the role from mongoDb
		// const authuser = await authuserDbService.getAuthUser({ id: payload.sub });

		// I created an outer join query in mongoDb to obtain the role of the user as well
		const authuser = await joinedDbService.getAuthUserWithRole(payload.sub);

		if (!authuser) return done(null, false);

		done(null, { authuser, payload });

	} catch (error) {
		done( locateError(error, "Passport : jwtVerify") );
	}
};


// oAuth strategy is simply a BaererStrategy, so the token is extracted from req.headers by passport
const oAuthVerify = (service) => async (req, token, done) => {
	try {

		const oAuth = await authProviders[service](token);

		// authProviders always return an object which is { provider, user: { id, email }}
		// but there is possibility that user.id and user.email could be null or undefined
		
		return done(null, oAuth);

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
