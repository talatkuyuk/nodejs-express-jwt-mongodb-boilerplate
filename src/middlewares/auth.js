const passport = require('passport');
const httpStatus = require('http-status');

const ApiError = require('../utils/ApiError');
const { roleRights } = require('../config/roles');

const verifyCallback = (req, resolve, reject, requiredRights) => async (err, user, info) => {
  const errorMessage = (err ? err.message : "") + (info ? info : "");

  // if no errormessage
  if (!user && errorMessage === "") errorMessage = "user not found";

  if (err || info || !user) {
    return reject(new ApiError(httpStatus.UNAUTHORIZED, errorMessage));
  }

  if (user.disabled) {
	throw new ApiError(httpStatus.UNAUTHORIZED, `You are disabled. Call the system administrator.`);
  }

  req.user = user;
  
  if (requiredRights.length) {
	const userRights = roleRights[user.role];
	const userRightsWithoutSelf = roleRights[user.role].map(right => right.split("@")[0]);

    requiredRights.forEach((requiredRight) => {
		const index = userRightsWithoutSelf.findIndex(right => right === requiredRight);

		if (index === -1)
			return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden. (has no rights)'));

		if (userRights[index].includes("self")) 
			if (req.params.id !== user.id.toString()) 
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