const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');

const config = require('../config');
const { tokenTypes } = require('../config/tokens');
const authuserService = require('../services/authuser.service');

const jwtOptions = {
	secretOrKey: config.jwt.secret,
	jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
};

const jwtVerify = async (payload, done) => {
	try {
		if (payload.type !== tokenTypes.ACCESS) {
			throw new Error('Invalid token type');
		}

		const authuser = await authuserService.getAuthUserById(payload.sub);

		if (!authuser) return done(null, false);
		
		done(null, authuser);

	} catch (error) {
		done(error, false);
	}
};

const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);

module.exports = {
	jwtStrategy,
};
