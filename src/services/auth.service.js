const httpStatus = require("http-status");
const bcrypt = require("bcryptjs");

const ApiError = require("../utils/ApiError");
const { traceError } = require("../utils/errorUtils");
const { AuthUser } = require("../models");
const { authProvider } = require("../config/providers");

// SERVICE DEPENDENCIES
const redisService = require("./redis.service");
const authuserDbService = require("./authuser.db.service");

/////////////////////////  UTILS  ///////////////////////////////////////

/**
 * This function occurs in multiple places, just for preventing to code dublication
 * @param {AuthUser} authuser
 * @returns {void}
 */
const checkAuthuser = function (authuser) {
  try {
    if (!authuser) throw new ApiError(httpStatus.NOT_FOUND, "No user found");

    if (authuser.isDisabled)
      throw new ApiError(
        httpStatus.FORBIDDEN,
        `You are disabled, call the system administrator`
      );
  } catch (error) {
    throw error;
  }
};

/////////////////////////////////////////////////////////////////////

/**
 * Signup with email and password
 * @param {string} email
 * @param {string} password
 * @param {import('express').Request} request
 * @returns {Promise<AuthUser>}
 */
const signupWithEmailAndPassword = async (email, password, request) => {
  try {
    const authuser = await authuserDbService.getAuthUser({ email });

    // if authuser exists and password is not null
    if (authuser && Boolean(authuser.password)) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "email is already taken");
    }

    const hashedPassword = await bcrypt.hash(password, 8);

    // means the authuser registered with a provider but not email-password, so assign the password
    if (authuser) {
      request && (request.isNewAuthuserCreated = false);

      return await authuserDbService.updateAuthUser(authuser.id, {
        password: hashedPassword,
        services: { ...authuser.services, emailpassword: false }, // false means the user registers with email while he is already registered with a provider, needs email verification
      });
    }

    const authuserDoc = new AuthUser(email, hashedPassword);
    authuserDoc.services = { emailpassword: true };

    const newauthuser = await authuserDbService.addAuthUser(authuserDoc);

    // TODO: is it necessary? An error in authuserDbService.addAuthUser is already being catched in tyr-catch
    if (!newauthuser)
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "The database could not process the request"
      );

    request && (request.isNewAuthuserCreated = true);

    return newauthuser;
  } catch (error) {
    throw traceError(error, "AuthService : signupWithEmailAndPassword");
  }
};

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
      throw new ApiError(
        httpStatus.UNAUTHORIZED,
        "Incorrect email or password"
      );
    }

    return authuser;
  } catch (error) {
    throw traceError(error, "AuthService : loginWithEmailAndPassword");
  }
};

/**
 * Login/Signup with a oAuth Provider
 * @param {string} service // "google" | "facebook"
 * @param {string} id
 * @param {string} email
 * @param {import('express').Request} request
 * @returns {Promise<AuthUser>}
 */
const continueWithAuthProvider = async (provider, id, email, request) => {
  try {
    const authuser = await authuserDbService.getAuthUser({ email });

    if (authuser) {
      if (authuser.isDisabled) {
        throw new ApiError(
          httpStatus.FORBIDDEN,
          "You are disabled, call the system administrator"
        );
      }

      request && (request.isNewAuthuserCreated = false);

      // if the user is registered with the same auth provider
      if (authuser.services[provider] === id) return authuser;

      // if the user is registered with email or other auth provider
      return await authuserDbService.updateAuthUser(authuser.id, {
        isEmailVerified: true,
        services: { ...authuser.services, [provider]: id },
      });
    }

    // if there is no authuser, then create a new one
    const authuserDoc = new AuthUser(email, null);
    authuserDoc.isEmailVerified = true;
    authuserDoc.services = {
      [provider]: id, // { google: 46598364598354983 }
    };

    const newauthuser = await authuserDbService.addAuthUser(authuserDoc);

    // TODO: is it necessary? An error in authuserDbService.addAuthUser is already being catched in tyr-catch
    if (!newauthuser)
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "The database could not process the request"
      );

    request && (request.isNewAuthuserCreated = true);

    return newauthuser;
  } catch (error) {
    throw traceError(error, "AuthService : loginWithAuthProvider");
  }
};

/**
 * Unlink an auth provider
 * @param {Authuser} authuser
 * @param {string} provider
 * @returns {Promise<AuthUser>}
 */
const unlinkAuthProvider = async (authuser, provider) => {
  try {
    if (!authuser.services?.hasOwnProperty(provider)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "The auth provider is already unlinked"
      );
    }

    if (Object.keys(authuser.services).length === 1) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "There must be one auth provider at least"
      );
    }

    const newAuthProviders = { ...authuser.services };
    delete newAuthProviders[provider];

    let updateBody = {
      services: newAuthProviders,
    };

    if (provider === authProvider.EMAILPASSWORD) {
      updateBody.password = null;
    }

    const authuserUpdated = await authuserDbService.updateAuthUser(
      authuser.id,
      updateBody
    );

    return authuserUpdated;
  } catch (error) {
    throw traceError(error, "AuthService : unlinkAuthProvider");
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
    throw traceError(error, "AuthService : logout");
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
    throw traceError(error, "AuthService : signout");
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
    throw traceError(error, "AuthService : refreshAuth");
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
    throw traceError(error, "AuthService : forgotPassword");
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

    const updatedAuthuser = await authuserDbService.updateAuthUser(
      authuser.id,
      {
        password,
        services: { ...authuser.services, emailpassword: true },
      }
    );

    return updatedAuthuser;
  } catch (error) {
    throw traceError(error, "AuthService : resetPassword");
  }
};

/**
 * Check if the authuser's email is already verified
 * @param {boolean} isEmailVerified
 * @returns {any}
 */
const handleEmailIsVerified = function (isEmailVerified) {
  if (isEmailVerified) {
    const error = new ApiError(
      httpStatus.BAD_REQUEST,
      "Email is already verified"
    );
    throw traceError(error, "AuthService : handleEmailIsVerified");
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

    const updatedAuthuser = await authuserDbService.updateAuthUser(
      authuser.id,
      { isEmailVerified: true }
    );

    return updatedAuthuser;
  } catch (error) {
    throw traceError(error, "AuthService : verifyEmail");
  }
};

/**
 * Check if the authuser's services already contain { emailpassword: true }
 * @param {boolean} emailpassword
 * @returns {any}
 */
const handleSignupIsVerified = function (emailpassword) {
  if (emailpassword) {
    const error = new ApiError(
      httpStatus.BAD_REQUEST,
      "Signup is already verified"
    );
    throw traceError(error, "AuthService : handleSignupIsVerified");
  }
};

/**
 * Verify signup
 * @param {string} id
 * @returns {Promise<AuthUser>}
 */
const verifySignup = async (id) => {
  try {
    const authuser = await authuserDbService.getAuthUser({ id });

    checkAuthuser(authuser);

    const updatedAuthuser = await authuserDbService.updateAuthUser(
      authuser.id,
      { services: { ...authuser.services, emailpassword: true } }
    );

    return updatedAuthuser;
  } catch (error) {
    throw traceError(error, "AuthService : verifySignup");
  }
};

module.exports = {
  signupWithEmailAndPassword,
  loginWithEmailAndPassword,
  continueWithAuthProvider,
  unlinkAuthProvider,
  logout,
  signout,
  refreshAuth,
  forgotPassword,
  resetPassword,
  handleEmailIsVerified,
  verifyEmail,
  handleSignupIsVerified,
  verifySignup,
};
