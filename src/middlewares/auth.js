const passport = require('passport');
const httpStatus = require('http-status');

const {OAuth2Client} = require('google-auth-library');

const config = require('../config');
const ApiError = require('../utils/ApiError');
const userService = require('../services/user.service');
const { roleRights } = require('../config/roles');
const redisClient = require('../utils/cache');


const verifyCallback = (req, resolve, reject, requiredRights) => async (err, pass, info) => {
	//TODO: syntax error was not catched by error handling? let-const

	const {authuser, payload} = pass;
	
	let errorMessage = (err ? err.message : "") + (info ? info : "");

	// if no error message and no AuthUser
	if (errorMessage === "" && !authuser) errorMessage = "Access token does not refer any user.";

	if (err || info || !authuser) {
		return reject(new ApiError(httpStatus.UNAUTHORIZED, errorMessage));
	}

	if (authuser.isDisabled) {
		return reject(new ApiError(httpStatus.UNAUTHORIZED, `You are disabled. Call the system administrator.`));
	}

	// control if the request is coming from the same useragent - for preventing mitm
	if (req.useragent.source !== payload.ua) {
		return reject(new ApiError(httpStatus.UNAUTHORIZED, `Your browser/agent seems changed or updated, you have to re-login to get authentication.`));
	}

	// control if the token is in blacklist
	if (redisClient.get(`blacklist_${payload.jti}`))
		return reject(new ApiError(httpStatus.FORBIDDEN, `The token is in the blacklist.`));

	req.user = authuser;
	
	if (requiredRights.length) {

		const user = await userService.getUser(authuser.id);
		const role = user?.role ?? "user"; // there is no role yet while adding a user

		console.log("role: ", role);

		const userRights = roleRights[role];
		const userRightsWithoutSelf = roleRights[role].map(right => right.split("@")[0]);

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


const oAuth = (service) => (req, res, next) => passport.authenticate(
	service, 
	{ session: false },
	function(err, payload, info) {
		if (err) { return next(err); }

		//passport-authentication error
        if (!payload) { return  next(new Error('Invalid-Formed Bearer Token. ' + (info ?? ""))); }
        
		next()
	}
)(req, res, next);


const google_oAuth = async (req, res, next) => {
	try {
		const idToken = req.body.idToken;
		
		const client = new OAuth2Client(config.google_client_id);

		const ticket = await client.verifyIdToken({
			idToken,
			audience: config.google_client_id, // if multiple clients [id1, id2, ...]
		});

		req.oAuth = {provider: "google", payload: ticket.getPayload()};

		next();
	
	} catch (error) {
		next(error);
	}
}

module.exports = { auth, oAuth, google_oAuth };
