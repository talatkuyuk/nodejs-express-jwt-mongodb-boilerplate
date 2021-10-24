const httpStatus = require('http-status');

const { ApiError, locateError } = require('../utils/ApiError');
const { userService } = require('../services');
const { roleRights } = require('../config/roles');

const authorize = (...requiredRights) => async (req, res, next) => {
	try {

		// the role might be obtained if the joined query is implemented in passport/jwtVerify
		let role = req.authuser.role;

		if (!role) {
			role = await userService.getUserRole(req.authuser.id);
			role ??= "user"; // if there is no user's role yet forexample just after adding an authuser, assign it as "user"
			req.authuser.role = role;
		}

		// I put this line after the role assignment
		if (requiredRights.length === 0) next();

		console.log("authorization role:", role)

		const userRights = roleRights[role];

		if (!userRights)
			throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden, (you do not have appropriate right)');

		const userRightsWithoutSelf = userRights.map(right => right.split("@")[0]);

		requiredRights.forEach((requiredRight) => {
			const index = userRightsWithoutSelf.findIndex(right => right === requiredRight);

			if (index === -1)
				throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden, (you do not have appropriate right)');

			if (userRights[index].includes("self") && req.params && req.params.id)
				if (req.params.id.toString() !== req.authuser.id.toString()) 
					throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden, (only self-data)');
		});

		next();
		
	} catch (error) {
		next( locateError(error, "AuthorizeMiddleware : authorize") );
	}
};

module.exports = authorize;