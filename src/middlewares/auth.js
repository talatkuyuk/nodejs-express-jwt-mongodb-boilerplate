const passport = require('passport');
const httpStatus = require('http-status');

const ApiError = require('../utils/ApiError');
const userService = require('../services/user.service');
const { roleRights } = require('../config/roles');
const logger = require('../core/logger');
const redisClient = require('../utils/cache').getRedisClient();


const verifyCallback = (req, resolve, reject, requiredRights) => async (err, pass, info) => {
	//TODO: syntax error was not catched by error handling? let-const

	if (err || info) {
		return reject(new ApiError(httpStatus.UNAUTHORIZED, `TokenError: ${err?.message || info?.message}` ));
	}

	const { authuser, payload } = pass;

	if (!authuser) {
		return reject(new ApiError(httpStatus.UNAUTHORIZED, "Access token does not refer any user"));
	}

	if (authuser.isDisabled) {
		return reject(new ApiError(httpStatus.FORBIDDEN, `You are disabled. Call the system administrator`));
	}

	// control if the request is coming from the same useragent - for preventing mitm
	if (req.useragent.source !== payload.ua) {
		return reject(new ApiError(httpStatus.UNAUTHORIZED, `Your browser/agent seems changed or updated, you have to re-login to get authentication`));
	}

	// control if the token is in blacklist
	if (redisClient.connected) { 
		if (await redisClient.get(`blacklist_${payload.jti}`))
			return reject(new ApiError(httpStatus.FORBIDDEN, `The token is in the blacklist`));
	} else {
		logger.warn("Auth: Redis server is down at the moment.");
		return reject(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `We've encountered a server internal problem (Redis)`));
	}
	
	req.user = authuser;
	
	if (requiredRights.length) {

		const user = await userService.getUser(authuser.id);
		const role = user?.role ?? "user"; // there is no role yet while adding a user
		req.user.role = role;

		const userRights = roleRights[role];
		const userRightsWithoutSelf = roleRights[role].map(right => right.split("@")[0]);

		requiredRights.forEach((requiredRight) => {
			const index = userRightsWithoutSelf.findIndex(right => right === requiredRight);

			if (index === -1)
				return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden, (you don\'t have appropriate right)'));

			if (userRights[index].includes("self")) 
				if (req.params?.id.toString() !== authuser.id.toString()) 
					return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden. (only self-data)'));
		});
	}

  resolve();
};

const auth = (...requiredRights) => async (req, res, next) => {
	return new Promise((resolve, reject) => {
		passport.authenticate('jwt', { session: false }, verifyCallback(req, resolve, reject, requiredRights))(req, res, next);
	})
	.then(() => next())
	.catch((err) => {next(err)});
};

module.exports = { auth };
