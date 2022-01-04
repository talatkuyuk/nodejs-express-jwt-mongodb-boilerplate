const httpStatus = require('http-status');
const bcrypt = require('bcryptjs');

const ApiError = require('../utils/ApiError');
const { locateError } = require('../utils/errorUtils');
const { AuthUser } = require('../models');

// SERVICE DEPENDENCIES
const redisService = require('./redis.service');
const authuserDbService = require('./authuser.db.service');


/////////////////////////  UTILS  ///////////////////////////////////////

/**
 * This function occurs in multiple places, just for preventing to code dublication
 * @param {AuthUser} authuser
 * @returns {void}
 */
 const checkAuthuser = function (authuser) {
	 try {
		 if (!authuser)
			 throw new ApiError(httpStatus.NOT_FOUND, 'No user found');
	 
		 if (authuser.isDisabled)
			 throw new ApiError(httpStatus.FORBIDDEN, `You are disabled, call the system administrator`);
		 
	 } catch (error) {
		 throw error;
	 }
};


/////////////////////////////////////////////////////////////////////


/**
 * Signup with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<AuthUser>}
 */
const signupWithEmailAndPassword = async (email, password) => {
	try {

		const hashedPassword = await bcrypt.hash(password, 8);
		const authuserx = new AuthUser(email, hashedPassword);
		authuserx.services = { emailpassword: "registered" };

		const authuser = await authuserDbService.addAuthUser(authuserx);
		
		if (!authuser)
			throw new ApiError(httpStatus.BAD_REQUEST, "The database could not process the request");

		return authuser;

	} catch (error) {
		throw locateError(error, "AuthService : signupWithEmailAndPassword");
	}
}
 			


/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<AuthUser>}
 */
const loginWithEmailAndPassword = async (email, password) => {
	try {
		const authuser = await authuserDbService.getAuthUser({ email });

		checkAuthuser(authuser);

		if (!(await authuser.isPasswordMatch(password))) {
			throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
		}

		return authuser;

	} catch (error) {
		throw locateError(error, "AuthService : loginWithEmailAndPassword");
	}
};



/**
 * Login with oAuth
 * @param {string} service // "google" | "facebook"
 * @param {string} id
 * @param {string} email
 * @returns {Promise<AuthUser>}
 */
const loginWithAuthProvider = async (provider, id, email) => {
	try {
		const authuser = await authuserDbService.getAuthUser({ email });

		if (authuser) {

			if (authuser.isDisabled)
				throw new ApiError(httpStatus.FORBIDDEN, `You are disabled, call the system administrator`);

			if (authuser.services[provider] === id)
				return authuser;

			return await authuserDbService.updateAuthUser(authuser.id, { services: { ...authuser.services, [provider]: id }, isEmailVerified: true });
		}

		// if there is no authuser, then create a new one
		const authuserx = new AuthUser(email, null);
		authuserx.isEmailVerified = true;
		authuserx.services = { 
			emailpassword: "not registered",
			[provider]: id   // { google: 46598364598354983 }
		};

		return await authuserDbService.addAuthUser(authuserx);
		
	} catch (error) {
		throw locateError(error, "AuthService : loginWithAuthProvider");
	}
};



/**
 * Handle the logout process
 * @param {string} id
 * @param {string} jti
 * @returns {Promise}
 */
const logout = async (id, jti) => {
	try {
		
		// put the access token's jti into the blacklist
		await redisService.put_into_blacklist("jti", jti);
		
	} catch (error) {
		throw locateError(error, "AuthService : logout");
	}
};



/**
 * Handle the signout process
 * @param {string} id
 * @param {string} jti
 * @returns {Promise}
 */
 const signout = async (id, jti) => {
	try {
		// put the access token's jti into the blacklist
		await redisService.put_into_blacklist("jti", jti);

		// delete authuser by id; no need to check id in database since passed the authorization soon ago
		await authuserDbService.deleteAuthUser(id);

		// delete user data through another request
		
	} catch (error) {
		throw locateError(error, "AuthService : signout");
	}
};



/**
 * Refresh auth tokens
 * @param {string} id
 * @returns {Promise<Authuser>}
 */
const refreshAuth = async (id) => {
  try {
	const authuser = await authuserDbService.getAuthUser({ id });

	checkAuthuser(authuser);

	return authuser;

  } catch (error) {
	throw locateError(error, "AuthService : refreshAuth");
  }
};



/**
 * Forgot password
 * @param {string} email
 * @returns {Promise<AuthUser>}
 */
 const forgotPassword = async (email) => {
	try {
	  const authuser = await authuserDbService.getAuthUser({ email });
  
	  checkAuthuser(authuser);
  
	  return authuser;
  
	} catch (error) {
	  throw locateError(error, "AuthService : forgotPassword");
	}
  };



/**
 * Reset password
 * @param {string} id
 * @param {string} newPassword
 * @returns {Promise<AuthUser>}
 */
const resetPassword = async (id, newPassword) => {
  try {
    const authuser = await authuserDbService.getAuthUser({ id });

    checkAuthuser(authuser);

	const password = await bcrypt.hash(newPassword, 8);
    
    const updatedAuthuser = await authuserDbService.updateAuthUser(authuser.id, { 
		password, 
		services: { ...authuser.services, emailpassword: "registered" }
	});
	
	return updatedAuthuser;

  } catch (error) {
	throw locateError(error, "AuthService : resetPassword");
  }
};



/**
 * Check if the authuser's email is already verified
 * @param {boolean} isEmailVerified
 * @returns {any}
 */
 const handleEmailIsVerified = function (isEmailVerified) {
	if (isEmailVerified) {
		const error = new ApiError(httpStatus.BAD_REQUEST, "Email is already verified");
		throw locateError(error, "AuthService : handleEmailIsAlreadyVerified");
	}
};



/**
 * Verify email
 * @param {string} id
 * @returns {Promise<AuthUser>}
 */
const verifyEmail = async (id) => {
  try {
    const authuser = await authuserDbService.getAuthUser({ id });
    
	checkAuthuser(authuser);
    
    const updatedAuthuser = await authuserDbService.updateAuthUser(authuser.id, { isEmailVerified: true });

	return updatedAuthuser;

  } catch (error) {
	throw locateError(error, "AuthService : verifyEmail");
  }
};



module.exports = {
  signupWithEmailAndPassword,
  loginWithEmailAndPassword,
  loginWithAuthProvider,
  logout,
  signout,
  refreshAuth,
  forgotPassword,
  resetPassword,
  handleEmailIsVerified,
  verifyEmail,
};
