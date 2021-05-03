const passport = require('passport');
const httpStatus = require('http-status');

const ApiError = require('../utils/ApiError');
const userService = require('../services/user.service');
const { roleRights } = require('../config/roles');

const verifyCallback = (req, resolve, reject, requiredRights) => async (err, authuser, info) => {
	//TODO: syntax error was not catched by error handling? let-const

	let errorMessage = (err ? err.message : "") + (info ? info : "");

	// if no errormessage
	if (!authuser && errorMessage === "") errorMessage = "Access token does not refer any user.";

	if (err || info || !authuser) {
		return reject(new ApiError(httpStatus.UNAUTHORIZED, errorMessage));
	}

	if (authuser.disabled) {
		return reject(new ApiError(httpStatus.UNAUTHORIZED, `You are disabled. Call the system administrator.`));
	}

	req.user = authuser;
	
	if (requiredRights.length) {

		const user = await userService.getUserById(authuser.id);

		const userRights = roleRights[user.role];
		const userRightsWithoutSelf = roleRights[user.role].map(right => right.split("@")[0]);

		requiredRights.forEach((requiredRight) => {
			const index = userRightsWithoutSelf.findIndex(right => right === requiredRight);

			if (index === -1)
				return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden. (has no rights)'));

			if (userRights[index].includes("self")) 
				if (req.params.id && req.params.id !== authuser.id.toString()) 
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
	.catch((err) => next(err));
};

module.exports = auth;