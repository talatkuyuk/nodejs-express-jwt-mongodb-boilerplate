const passport = require('passport');
const httpStatus = require('http-status');

const ApiError = require('../utils/ApiError');
const { userDbService } = require('../services');
const { roleRights } = require('../config/roles');
const { getRedisClient } = require('../core/redis');


const verifyCallback = (req, resolve, reject, requiredRights) => async (err, pass, info) => {
	try {
		if (err || info) {
			return reject(new ApiError(httpStatus.UNAUTHORIZED, `TokenError: ${err?.message || info?.message}` ));
		}
		
		const { authuser, payload } = pass;
	
		if (!authuser) {
			return reject(new ApiError(httpStatus.UNAUTHORIZED, "Access token does not refer any user"));
		}
	
		if (authuser.isDisabled) {
			return reject(new ApiError(httpStatus.FORBIDDEN, `You are disabled, call the system administrator`));
		}
	
		// control if the request is coming from the same useragent - for preventing mitm
		if (req.useragent.source !== payload.ua) {
			return reject(new ApiError(httpStatus.UNAUTHORIZED, `Your browser/agent seems changed or updated, you have to re-login to get authentication`));
		}
	
	
		// control if the token is in blacklist
		const redisClient = getRedisClient();
		if (redisClient) {
			if (await redisClient.get(`blacklist_${payload.jti}`))
				return reject(new ApiError(httpStatus.FORBIDDEN, `Access token is in the blacklist`));
		} else {
			logger.warn("Redis Client is down at the moment of authorization.");
			return reject(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `We've encountered a server internal problem (Redis)`));
		}
			
		req.user = authuser;
		authuser.jti = payload.jti; // it refers to access token and refresh token paired
		// to get accessToken use req.headers.authorization.split(' ')[1];
		
		if (requiredRights.length) {
	
			const user = await userDbService.getUser(authuser.id);
			const role = user?.role ?? "user"; // there is no role yet while adding a user
			req.user.role = role;
	
			const userRights = roleRights[role];
			const userRightsWithoutSelf = roleRights[role].map(right => right.split("@")[0]);
	
			requiredRights.forEach((requiredRight) => {
				const index = userRightsWithoutSelf.findIndex(right => right === requiredRight);
	
				if (index === -1)
					return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden, (you don\'t have appropriate right)'));
	
				if (userRights[index].includes("self") && req.params && req.params.id)
					if (req.params.id.toString() !== authuser.id.toString()) 
						return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden, (only self-data)'));
			});
		}
	
		resolve();
		
	} catch (error) {
		error.description || (error.description = "Authorization middleware [verifyCallback] failed");
		reject(error);
	}
};

const auth = (...requiredRights) => async (req, res, next) => {
	return new Promise((resolve, reject) => {
		passport.authenticate('jwt', { session: false }, verifyCallback(req, resolve, reject, requiredRights))(req, res, next);
	})
	.then(() => next())
	.catch((error) => { error.description || (error.description = "Process failed in Authorization middleware"); next(error)});
};

module.exports = { auth };
