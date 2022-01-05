const passport = require('passport');
const httpStatus = require('http-status');

const ApiError = require('../utils/ApiError');
const { traceError } = require('../utils/errorUtils');
const { redisService } = require('../services');


// The Strategies which is related with the "service" are registered into the passport in express(app), 
// and the strategy is going to be processed in the passport oAuthVerify, considering the "service"
const oAuth = (service) => async (req, res, next) => {
	return new Promise((resolve, reject) => {
		passport.authenticate( service,	 { session: false }, async function(err, oAuth, info) {
			try {
				if (err) {
					if (err.message?.includes("ENOTFOUND"))
						err.message = "Auth provider connection error occured, try later"
					throw new ApiError(httpStatus.UNAUTHORIZED, err);
				}

				if (info) {
					if (typeof(info) === "string")
						throw new ApiError(httpStatus.BAD_REQUEST, `Badly formed Authorization Header with Bearer. [${info}]`);
					
					if (info instanceof Error)
						throw new ApiError(httpStatus.BAD_REQUEST, info);
				}
		
				if (!oAuth) {
					throw new ApiError(httpStatus.BAD_REQUEST, 'Badly formed Authorization Header with Bearer');
				}

				if (!oAuth.user.id) {
					throw new ApiError(httpStatus.UNAUTHORIZED, `${service} oAuth token could not be associated with any identification`);
				}

				if (!oAuth.user.email) {
					throw new ApiError(httpStatus.UNAUTHORIZED, `${service} oAuth token does not contain necessary email information.`);
				}

				// control if the authProvider's token is in the blacklist 
				if (await redisService.check_in_blacklist(oAuth.token)) {
					throw new ApiError(httpStatus.FORBIDDEN, `The token of the auth provider (${oAuth.provider}) is allowed to be used only once`);
				}

				// if everything is okey, then put the token into the blacklist aiming one-shot usage
				// this time we put the token itself not jti, since all authProviders' tokens does not contain a jti claim
				await redisService.put_into_blacklist("token", oAuth);

				req.oAuth = oAuth;
				
				resolve();

			} catch (error) {
				reject( traceError(error, "oAuthMiddleware : oAuth(callback)") );
			}
		})(req, res, next)
	})
	.then(() => next())
	.catch((error) => { 
		next( traceError(error, "AuthMiddleware : oAuth") );
	});
}


module.exports = oAuth;
