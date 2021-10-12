const passport = require('passport');
const httpStatus = require('http-status');

const { ApiError, locateError } = require('../utils/ApiError');
const { userDbService, redisService } = require('../services');
const { roleRights } = require('../config/roles');


const verifyCallback = (req, resolve, reject, requiredRights) => async (err, pass, info) => {
	try {
		if (err || info) {
			throw new ApiError(httpStatus.UNAUTHORIZED, err || info );
		}
		
		const { authuser, payload } = pass;
	
		if (!authuser) {
			throw new ApiError(httpStatus.UNAUTHORIZED, "Access token does not refer any user");
		}
	
		if (authuser.isDisabled) {
			throw new ApiError(httpStatus.FORBIDDEN, `You are disabled, call the system administrator`);
		}
	
		// control if the request is coming from the same useragent - for preventing mitm
		if (req.useragent.source !== payload.ua) {
			throw new ApiError(httpStatus.UNAUTHORIZED, `Your browser/agent seems changed or updated, you have to re-login to get authentication`);
		}
	
		// control if the token is in blacklist
		if (await redisService.check_jti_in_blacklist(payload.jti)) {
			throw new ApiError(httpStatus.FORBIDDEN, `Access token is in the blacklist`);
		}
			
		req.user = authuser;
		authuser.jti = payload.jti; // it refers to access token and refresh token paired
		// to get accessToken use req.headers.authorization.split(' ')[1];
		
		if (requiredRights.length) {
			
			const user = await userDbService.getUser({ id: authuser.id });
			const role = user?.role ?? "user"; // there is no role yet forexample while adding an authuser
			req.user.role = role;
	
			const userRights = roleRights[role];
			const userRightsWithoutSelf = roleRights[role].map(right => right.split("@")[0]);
	
			requiredRights.forEach((requiredRight) => {
				const index = userRightsWithoutSelf.findIndex(right => right === requiredRight);
	
				if (index === -1)
					throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden, (you don\'t have appropriate right)');
	
				if (userRights[index].includes("self") && req.params && req.params.id)
					if (req.params.id.toString() !== authuser.id.toString()) 
						throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden, (only self-data)');
			});
		}
	
		resolve();
		
	} catch (error) {
		reject( locateError(error, "AuthMiddleware : verifyCallback") );
	}
};

const auth = (...requiredRights) => async (req, res, next) => {
	return new Promise((resolve, reject) => {
		passport.authenticate('jwt', { session: false }, verifyCallback(req, resolve, reject, requiredRights))(req, res, next);
	})
	.then(() => next())
	.catch((error) => { 
		next( locateError(error, "AuthMiddleware : auth") );
	});
};

module.exports = { auth };
