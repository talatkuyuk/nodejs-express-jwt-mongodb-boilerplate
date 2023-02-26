const httpStatus = require("http-status");
const bcrypt = require("bcryptjs");

const ApiError = require("../utils/ApiError");
const { traceError } = require("../utils/errorUtils");
const composeFilter = require("../utils/composeFilter");
const composeSort = require("../utils/composeSort");
const { AuthUser } = require("../models");
const { authProvider } = require("../config/providers");

// SERVICE DEPENDENCIES
const paginaryService = require("./paginary.service");
const authuserDbService = require("./authuser.db.service");

/////////////////////////  UTILS  ///////////////////////////////////////

/**
 * Check if the email is already taken
 * @param {String} email
 * @returns {Promise<Boolean>}
 */
const isEmailTaken = async function (email) {
  try {
    const authuser = await authuserDbService.getAuthUser({ email });

    return !!authuser && Boolean(authuser.password);
    // return !!authuser;
  } catch (error) {
    throw traceError(error, "AuthUserService : isEmailTaken");
  }
};

/**
 * Check if the authuser exists; and check the id and the email match
 * @param {String} id
 * @param {String} email
 * @returns {Promise<Boolean>}
 */
const isExist = async function (id, email) {
  try {
    const authuser = await authuserDbService.getAuthUser({ id, email });
    return !!authuser;
  } catch (error) {
    throw traceError(error, "AuthUserService : isExist");
  }
};

/////////////////////////////////////////////////////////////////////

/**
 * Add authuser with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<AuthUser>}
 */
const addAuthUser = async (email, password) => {
  try {
    const hashedPassword = await bcrypt.hash(password, 8);
    const authuserDoc = new AuthUser(email, hashedPassword);
    authuserDoc.providers = { emailpassword: true };

    const authuser = await authuserDbService.addAuthUser(authuserDoc);

    if (!authuser)
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "The database could not process the request"
      );

    return authuser;
  } catch (error) {
    throw traceError(error, "AuthUserService : addAuthUser");
  }
};

/**
 * Get AuthUser by id
 * @param {string} id
 * @returns {Promise<AuthUser>}
 */
const getAuthUserById = async (id) => {
  try {
    const authuser = await authuserDbService.getAuthUser({ id });

    if (!authuser) throw new ApiError(httpStatus.NOT_FOUND, "No user found");

    return authuser;
  } catch (error) {
    throw traceError(error, "AuthUserService : getAuthUserById");
  }
};

/**
 * Get AuthUser by email
 * @param {string} email
 * @returns {Promise<AuthUser>}
 */
const getAuthUserByEmail = async (email) => {
  try {
    const authuser = await authuserDbService.getAuthUser({ email });

    if (!authuser) throw new ApiError(httpStatus.NOT_FOUND, "No user found");

    return authuser;
  } catch (error) {
    throw traceError(error, "AuthUserService : getAuthUserByEmail");
  }
};

/**
 * Get AuthUsers in a paginary
 * @param {Object} query
 * @returns {Promise<Object>}
 */
const getAuthUsers = async (query) => {
  try {
    const fields = {
      stringFields: ["email", "createdAt"],
      booleanFields: ["isEmailVerified", "isDisabled"],
    };
    const filter = composeFilter(query, fields);

    console.log(filter);

    const sortingFields = [
      "email",
      "isEmailVerified",
      "isDisabled",
      "createdAt",
    ];
    const sort = composeSort(query, sortingFields);

    return await paginaryService.paginary(
      query,
      filter,
      sort,
      authuserDbService.getAuthUsers
    );
  } catch (error) {
    throw traceError(error, "AuthUserService : getAuthUsers");
  }
};

/**
 * Enable & Disable AuthUser
 * @param {string} id
 * @returns {Promise}
 */
const toggleAbility = async (id) => {
  try {
    // get authuser first, it is necessary to toggle ability
    const authuser = await getAuthUserById(id);

    await authuserDbService.updateAuthUser(id, {
      isDisabled: !authuser.isDisabled,
    });
  } catch (error) {
    throw traceError(error, "AuthUserService : toggleAbility");
  }
};

/**
 * Toggle email verification status of an AuthUser
 * @param {string} id
 * @returns {Promise}
 */
const toggleVerification = async (id) => {
  try {
    // get authuser first, it is necessary to toggle verification
    const authuser = await getAuthUserById(id);

    await authuserDbService.updateAuthUser(id, {
      isEmailVerified: !authuser.isEmailVerified,
    });
  } catch (error) {
    throw traceError(error, "AuthUserService : toggleVerification");
  }
};

/**
 * Unlink an auth provider (called from an authorized route)
 * @param {string} id
 * @param {string} provider
 * @returns {Promise<AuthUser>}
 */
const unlinkProvider = async (id, provider) => {
  try {
    // throw new ApiError(httpStatus.BAD_REQUEST, `I can not do ${provider}`);

    const authuser = await getAuthUserById(id);

    if (!authuser.providers?.hasOwnProperty(provider)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "The auth provider is already unlinked"
      );
    }

    if (Object.keys(authuser.providers).length === 1) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "There must be one auth provider at least"
      );
    }

    const newAuthProviders = { ...authuser.providers };
    delete newAuthProviders[provider];

    let updateBody = {
      providers: newAuthProviders,
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
    throw traceError(error, "AuthUserService : unlinkProvider");
  }
};

/**
 * Change password
 * @param {string} id
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {Promise}
 */
const changePassword = async (id, newPassword) => {
  try {
    const password = await bcrypt.hash(newPassword, 8);
    const authuser = await authuserDbService.updateAuthUser(id, { password });

    if (!authuser) throw new ApiError(httpStatus.NOT_FOUND, "No user found");
  } catch (error) {
    throw traceError(error, "AuthUserService : changePassword");
  }
};

/**
 * Delete AuthUser
 * @param {string} id
 * @returns {Promise}
 */
const deleteAuthUser = async (id) => {
  try {
    const result = await authuserDbService.deleteAuthUser(id);

    if (!result) throw new ApiError(httpStatus.NOT_FOUND, "No user found");

    // delete user data through another request
  } catch (error) {
    throw traceError(error, "AuthUserService : deleteAuthUser");
  }
};

/**
 * Get Deleted AuthUser by id
 * @param {string} id
 * @returns {Promise<AuthUser?>}
 */
const getDeletedAuthUserById = async (id) => {
  try {
    const authuser = await authuserDbService.getDeletedAuthUser({ id });

    if (!authuser) throw new ApiError(httpStatus.NOT_FOUND, "No user found");

    return authuser;
  } catch (error) {
    throw traceError(error, "AuthUserService : getDeletedAuthUserById");
  }
};

module.exports = {
  isEmailTaken,
  isExist,

  addAuthUser,
  getAuthUserById,
  getAuthUserByEmail,
  getAuthUsers,
  toggleAbility,
  toggleVerification,
  unlinkProvider,
  changePassword,
  deleteAuthUser,
  getDeletedAuthUserById,
};
