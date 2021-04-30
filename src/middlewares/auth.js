const passport = require('passport');
const httpStatus = require('http-status');

const ApiError = require('../utils/ApiError');
const { roleRights } = require('../config/roles');

const verifyCallback = (req, resolve, reject, requiredRights) => async (err, user, info) => {
  const errorMessage = (err ? err.message : "") + (info ? info : "");

  if (err || info || !user) {
    return reject(new ApiError(httpStatus.UNAUTHORIZED, `${errorMessage}. Please authenticate`));
  }
  req.user = user;
  
  if (requiredRights.length) {
	const userRights = roleRights[user.role];
    const hasRequiredRights = requiredRights.every((requiredRight) => userRights.includes(requiredRight));

    if (!hasRequiredRights) {
      return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden. (has no rights)'));
    }

	const isSelf = req.params.userId === user.id.toString();
	if (userRights.includes("self") && !isSelf) {
		return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden. (only self-data)'));
  	}
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