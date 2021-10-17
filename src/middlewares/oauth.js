const passport = require('passport');
const httpStatus = require('http-status');

const { ApiError, locateError } = require('../utils/ApiError');


// Strategy related with the "service" are registered into passport in express(app), 
// and the strategy is going to be processed in passport oAuthVerify considering "service"
const oAuth = (service) => async (req, res, next) => {
	return new Promise((resolve, reject) => {
		passport.authenticate( service,	 { session: false }, function(err, oAuth, info) {
			try {
				if (err) {
					throw new ApiError(httpStatus.UNAUTHORIZED, err);
				}

				if (info) {
					if (typeof(info) === "string")
						throw new ApiError(httpStatus.BAD_REQUEST, `Badly formed Authorization Header with Bearer. [${info}]`);
					
					if (info instanceof Error)
						throw new ApiError(httpStatus.BAD_REQUEST, info);
				}
		
				if (!oAuth) {
					throw new ApiError(httpStatus.BAD_REQUEST, 'Badly formed Authorization Header with Bearer.');
				}

				if (!oAuth.user.id) {
					throw new ApiError(httpStatus.UNAUTHORIZED, `${service} oAuth token could not be associated with any identification.`);
				}

				if (!oAuth.user.email) {
					throw new ApiError(httpStatus.UNAUTHORIZED, `${service} oAuth token does not contain necessary email information.`);
				}

				req.oAuth = oAuth;
				
				resolve();

			} catch (error) {
				reject( locateError(error, "oAuthMiddleware : oAuth(callback)") );
			}
		})(req, res, next)
	})
	.then(() => next())
	.catch((error) => { 
		next( locateError(error, "AuthMiddleware : oAuth") );
	});
}


module.exports = { oAuth };
