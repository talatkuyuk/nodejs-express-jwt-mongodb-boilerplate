/** @typedef {import('../models/authuser.model')} AuthUser */

const { status: httpStatus } = require("http-status");
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
const checkAuthuserIsDisabled = function (authuser) {
  try {
    if (authuser.isDisabled)
      throw new ApiError(
        httpStatus.FORBIDDEN,
        `You are disabled, call the system administrator`,
      );
  } catch (error) {
    throw error;
  }
};

/**
 * Get AuthUser by id
 * @param {string} id
 * @returns {Promise<AuthUser>}
 */
const getAuthuserById = async (id) => {
  try {
    const authuser = await authuserDbService.getAuthUser({ id });

    if (!authuser) throw new ApiError(httpStatus.NOT_FOUND, "No user found");

    return authuser;
  } catch (error) {
    throw traceError(error, "AuthService : getAuthuserById");
  }
};

/**
 * Get AuthUser by email
 * @param {string} email
 * @returns {Promise<AuthUser>}
 */
const getAuthuserByEmail = async (email) => {
  try {
    const authuser = await authuserDbService.getAuthUser({ email });

    if (!authuser) throw new ApiError(httpStatus.NOT_FOUND, "No user found");

    return authuser;
  } catch (error) {
    throw traceError(error, "AuthService : getAuthuserByEmail");
  }
};

/////////////////////////////////////////////////////////////////////

/**
 * Signup with email and password
 * @typedef {Object} SignupResult
 * @property {AuthUser} authuser
 * @property {boolean} isNewAuthuserCreated
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<SignupResult>}
 */
const signupWithEmailAndPassword = async (email, password) => {
  try {
    const authuser = await authuserDbService.getAuthUser({ email });

    // if authuser exists and password is not null
    if (Boolean(authuser?.password)) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "email is already taken");
    }

    const hashedPassword = await bcrypt.hash(password, 8);

    // means the authuser registered with a provider but not email-password, so assign the password
    if (authuser) {
      const updatedAuthuser = await authuserDbService.updateAuthUser(authuser.id, {
        password: hashedPassword,
        providers: { ...authuser.providers, emailpassword: false }, // false means the user registers with email while he is already registered with a provider, needs email verification
      });

      if (!updatedAuthuser) {
        throw new ApiError(
          httpStatus.UNAUTHORIZED,
          "The database could not process the request",
        );
      }

      return { authuser: updatedAuthuser, isNewAuthuserCreated: false };
    }

    const newAuthuser = await authuserDbService.addAuthUser({
      email,
      password: hashedPassword,
      providers: { emailpassword: true },
    });

    if (!newAuthuser) {
      throw new ApiError(httpStatus.BAD_REQUEST, "The database could not process the request");
    }

    return { authuser: newAuthuser, isNewAuthuserCreated: true };
  } catch (error) {
    throw traceError(error, "AuthService : signupWithEmailAndPassword");
  }
};

/**
 * Check authuser password matches with password in request for login
 * @param {AuthUser} authuser
 * @param {string} password
 * @returns {Promise<void>}
 */
const checkPasswordMatchForLogin = async (authuser, password) => {
  try {
    if (!(await authuser.isPasswordMatch(password))) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Incorrect email or password");
    }
  } catch (error) {
    throw traceError(error, "AuthService : checkPasswordMatchForLogin");
  }
};

/**
 * Login/Signup with a oAuth Provider
 * @typedef {Object} ContinueWithAuthProviderResult
 * @property {AuthUser} authuser
 * @property {boolean} isNewAuthuserCreated
 *
 * @param {import('./authProviders').AuthProvider} provider
 * @param {string} id
 * @param {string} email
 * @returns {Promise<ContinueWithAuthProviderResult>}
 */
const continueWithAuthProvider = async (provider, id, email) => {
  try {
    const authuser = await authuserDbService.getAuthUser({ email });

    if (authuser) {
      checkAuthuserIsDisabled(authuser);

      // if the user is registered with the same auth provider
      if (authuser.providers?.[provider] === id) {
        return { authuser, isNewAuthuserCreated: false };
      }

      // if the user is registered with email or other auth provider
      const updatedAuthuser = await authuserDbService.updateAuthUser(authuser.id, {
        isEmailVerified: true,
        providers: { ...authuser.providers, [provider]: id },
      });

      if (!updatedAuthuser) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          "The database could not process the request",
        );
      }

      return { authuser: updatedAuthuser, isNewAuthuserCreated: false };
    }

    // if there is no authuser, then create a new one
    /** @type {import('./authuser.db.service').AuthuserFieldsForCreate} */
    const authuserDoc = {
      email,
      password: null,
      isEmailVerified: true,
      isDisabled: false,
      providers: {
        [provider]: id, // { google: 46598364598354983 }
      },
    };

    const newAuthuser = await authuserDbService.addAuthUser(authuserDoc);

    // TODO: is it necessary? An error in authuserDbService.addAuthUser is already being catched in tyr-catch
    if (!newAuthuser) {
      throw new ApiError(httpStatus.BAD_REQUEST, "The database could not process the request");
    }

    return { authuser: newAuthuser, isNewAuthuserCreated: true };
  } catch (error) {
    throw traceError(error, "AuthService : loginWithAuthProvider");
  }
};

/**
 * Unlink an auth provider (called from an authorized route)
 * @typedef {Object} AuthProviders
 * @property {boolean} [emailpassword]
 * @property {string} [google]
 * @property {string} [facebook]
 *
 * @param {string} id
 * @param {AuthProviders|undefined} providers
 * @param {import('./authProviders').AuthProvider} provider
 * @returns {Promise<AuthUser>}
 */
const unlinkAuthProvider = async (id, providers, provider) => {
  try {
    // checkAuthuserIsDisabled(authuser); not necessary since the authorize middleware handles this

    if (!providers?.hasOwnProperty(provider)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "The auth provider is already unlinked");
    }

    if (Object.keys(providers).length === 1) {
      throw new ApiError(httpStatus.BAD_REQUEST, "There must be one auth provider at least");
    }

    const newAuthProviders = { ...providers };
    delete newAuthProviders[provider];

    /** @type {import('./authuser.db.service.js').AuthuserFieldsForUpdate} */
    const updateBody = { providers: newAuthProviders };

    if (provider === authProvider.EMAILPASSWORD) {
      updateBody["password"] = null;
    }

    const updatedAuthuser = await authuserDbService.updateAuthUser(id, updateBody);

    if (!updatedAuthuser) {
      throw new ApiError(httpStatus.BAD_REQUEST, "The database could not process the request");
    }

    return updatedAuthuser;
  } catch (error) {
    throw traceError(error, "AuthService : unlinkAuthProvider");
  }
};

/**
 * Handle the logout process
 * @param {string} _id
 * @param {string} jti
 * @returns {Promise<void>}
 */
const logout = async (_id, jti) => {
  try {
    // put the access token's jti into the blacklist
    await redisService.put_jti_into_blacklist(jti);
  } catch (error) {
    throw traceError(error, "AuthService : logout");
  }
};

/**
 * Handle the signout process
 * @param {string} id
 * @param {string} jti
 * @returns {Promise<void>}
 */
const signout = async (id, jti) => {
  try {
    // put the access token's jti into the blacklist
    await redisService.put_jti_into_blacklist(jti);

    // delete authuser by id; no need to check id in database since passed the authorization soon ago
    await authuserDbService.deleteAuthUser(id);

    // delete user data through another request
  } catch (error) {
    throw traceError(error, "AuthService : signout");
  }
};

/**
 * Get and check Authuser by Id
 * @param {string} id
 * @returns {Promise<AuthUser>}
 */
const checkAuthuserById = async (id) => {
  try {
    const authuser = await getAuthuserById(id);
    checkAuthuserIsDisabled(authuser);
    return authuser;
  } catch (error) {
    throw traceError(error, "AuthService : refreshAuth");
  }
};

/**
 * Get and check Authuser by Email
 * @param {string} email
 * @returns {Promise<AuthUser>}
 */
const checkAuthuserByEmail = async (email) => {
  try {
    const authuser = await getAuthuserByEmail(email);
    checkAuthuserIsDisabled(authuser);
    return authuser;
  } catch (error) {
    throw traceError(error, "AuthService : forgotPassword");
  }
};

/**
 * Reset password
 * @param {AuthUser} authuser
 * @param {string} newPassword
 * @returns {Promise<AuthUser>}
 */
const resetPassword = async (authuser, newPassword) => {
  try {
    const password = await bcrypt.hash(newPassword, 8);

    const updatedAuthuser = await authuserDbService.updateAuthUser(authuser.id, {
      password,
      providers: { ...authuser.providers, emailpassword: true },
    });

    if (!updatedAuthuser) {
      throw new ApiError(httpStatus.BAD_REQUEST, "The database could not process the request");
    }

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
    const error = new ApiError(httpStatus.BAD_REQUEST, "Email is already verified");
    throw traceError(error, "AuthService : handleEmailIsVerified");
  }
};

/**
 * Verify email
 * @param {AuthUser} authuser
 * @returns {Promise<AuthUser>}
 */
const verifyEmail = async (authuser) => {
  try {
    const updatedAuthuser = await authuserDbService.updateAuthUser(authuser.id, {
      isEmailVerified: true,
    });

    if (!updatedAuthuser) {
      throw new ApiError(httpStatus.BAD_REQUEST, "The database could not process the request");
    }

    return updatedAuthuser;
  } catch (error) {
    throw traceError(error, "AuthService : verifyEmail");
  }
};

/**
 * Check if the authuser's providers already contain { emailpassword: true }
 * @param {boolean} [emailpassword]
 * @returns {any}
 */
const handleSignupIsVerified = function (emailpassword) {
  if (emailpassword) {
    const error = new ApiError(httpStatus.BAD_REQUEST, "Signup is already verified");
    throw traceError(error, "AuthService : handleSignupIsVerified");
  }
};

/**
 * Verify signup
 * @param {AuthUser} authuser
 * @returns {Promise<AuthUser>}
 */
const verifySignup = async (authuser) => {
  try {
    const updatedAuthuser = await authuserDbService.updateAuthUser(authuser.id, {
      providers: { ...authuser.providers, emailpassword: true },
    });

    if (!updatedAuthuser) {
      throw new ApiError(httpStatus.BAD_REQUEST, "The database could not process the request");
    }

    return updatedAuthuser;
  } catch (error) {
    throw traceError(error, "AuthService : verifySignup");
  }
};

module.exports = {
  signupWithEmailAndPassword,
  checkPasswordMatchForLogin,
  continueWithAuthProvider,
  unlinkAuthProvider,
  logout,
  signout,

  checkAuthuserById,
  checkAuthuserByEmail,

  resetPassword,
  handleEmailIsVerified,
  verifyEmail,
  handleSignupIsVerified,
  verifySignup,
};
