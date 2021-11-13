const passport = require('passport');
const httpStatus = require('http-status');

const { ApiError, locateError } = require('../utils/ApiError');
const { redisService } = require('../services');


const verifyCallback = (req, resolve, reject, requiredRights) => async (err, pass, info) => {
	try {
		if (err || info) {
			throw new ApiError(httpStatus.UNAUTHORIZED, err || info );
		}
		
		const { authuser, user, payload } = pass;
	
		if (!authuser) {
			throw new ApiError(httpStatus.UNAUTHORIZED, "Access token does not refer any user");
		}
	
		if (authuser.isDisabled) {
			throw new ApiError(httpStatus.FORBIDDEN, `You are disabled, call the system administrator`);
		}
	
		// control if the request is coming from the same useragent - for preventing mitm
		if (req.useragent.source !== payload.ua) {
			throw new ApiError(httpStatus.UNAUTHORIZED, `Your browser/agent seems changed or updated, you have to re-login.`);
		}
	
		// control if the token is in the blacklist
		if (await redisService.check_in_blacklist(payload.jti)) {
			throw new ApiError(httpStatus.FORBIDDEN, `Access token is in the blacklist`);
		}

		req.accesstoken = req.headers.authorization.split(' ')[1]
		req.jti = payload.jti; // the jti will be utilized to revoke the access token
		req.user = user; // the passport may return the user as well
		req.authuser = authuser;
			
		resolve();
		
	} catch (error) {
		reject( locateError(error, "AuthenticateMiddleware : verifyCallback") );
	}
};

const authenticate = async (req, res, next) => {
	try {
		await new Promise((resolve, reject) => {
			passport.authenticate('jwt', { session: false }, verifyCallback(req, resolve, reject))(req, res, next);
		})
		
		next();
		
	} catch (error) {
		next( locateError(error, "AuthenticateMiddleware : authenticate") );
	}
};

module.exports = authenticate;
