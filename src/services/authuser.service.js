/** @typedef {import('../models/authuser.model')} AuthUser */

const httpStatus = require("http-status");
const bcrypt = require("bcryptjs");

const ApiError = require("../utils/ApiError");
const { traceError } = require("../utils/errorUtils");
const { AuthUser } = require("../models");
const { authProvider } = require("../config/providers");

// SERVICE DEPENDENCIES
const paginaryService = require("./paginary.service");
const authuserDbService = require("./authuser.db.service");

/////////////////////////  UTILS  ///////////////////////////////////////

/**
 * Check if the email is already taken
 * @param {string} email
 * @returns {Promise<boolean>}
 */
const isEmailTaken = async function (email) {
  try {
    const authuser = await authuserDbService.getAuthUser({ email });

    return !!authuser && Boolean(authuser.password);
  } catch (error) {
    throw traceError(error, "AuthUserService : isEmailTaken");
  }
};

/**
 * Check if the authuser exists; and check the id and the email match
 * @param {string} id
 * @param {string} email
 * @returns {Promise<boolean>}
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

    const authuser = await authuserDbService.addAuthUser({
      email,
      password: hashedPassword,
      isDisabled: false,
      isEmailVerified: false,
      providers: { emailpassword: true },
    });

    if (!authuser) {
      throw new ApiError(httpStatus.BAD_REQUEST, "The database could not process the request");
    }

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
 * @typedef {Object} AuthuserQuery
 * @property {string} [email]
 * @property {string} [isEmailVerified]
 * @property {string} [isDisabled]
 * @property {string} [createdAt]
 * @property {string} page
 * @property {string} size
 * @property {string} sort
 *
 * @typedef {Object} AuthuserQueryResult
 * @property {AuthUser[]} authusers
 * @property {number} totalCount
 * @property {import('./paginary.service').Pagination} pagination
 *
 * @param {AuthuserQuery} query
 * @returns {Promise<AuthuserQueryResult>}
 */
const getAuthUsers = async (query) => {
  try {
    const filter = paginaryService.composeFilter(query, {
      stringFields: ["email", "createdAt"],
      booleanFields: ["isEmailVerified", "isDisabled"],
    });

    const sortingFields = ["email", "isEmailVerified", "isDisabled", "createdAt"];
    const sort = paginaryService.composeSort(query.sort, sortingFields);

    const { page, skip, limit } = paginaryService.composePaginationFactors(
      query.page,
      query.size,
    );

    console.log({ filter, sort, page, skip, limit });

    const { authusers, totalCount } = await authuserDbService.getAuthUsers(
      filter,
      sort,
      skip,
      limit,
    );

    console.log({ authusers, totalCount });

    const pagination = paginaryService.composePagination(totalCount, page, limit);

    return {
      authusers,
      totalCount,
      pagination,
    };
  } catch (error) {
    throw traceError(error, "AuthUserService : getAuthUsers");
  }
};

/**
 * Enable & Disable AuthUser
 * @param {string} id
 * @returns {Promise<void>}
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
 * @returns {Promise<void>}
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
 * @param {import('./authProviders').AuthProvider} provider
 * @returns {Promise<AuthUser>}
 */
const unlinkProvider = async (id, provider) => {
  try {
    const authuser = await getAuthUserById(id);

    if (authuser.providers) {
      if (!authuser.providers.hasOwnProperty(provider)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "The auth provider is already unlinked");
      }

      if (Object.keys(authuser.providers).length === 1) {
        throw new ApiError(httpStatus.BAD_REQUEST, "There must be one auth provider at least");
      }
    } else {
      throw new ApiError(httpStatus.BAD_REQUEST, "The auth provider is already unlinked");
    }

    const newAuthProviders = { ...authuser.providers };
    delete newAuthProviders[provider];

    const updatedAuthuser = await authuserDbService.updateAuthUser(authuser.id, {
      providers: newAuthProviders,
      ...(provider === authProvider.EMAILPASSWORD && { password: null }),
    });

    if (!updatedAuthuser) {
      throw new ApiError(httpStatus.BAD_REQUEST, "The database could not process the request");
    }

    return updatedAuthuser;
  } catch (error) {
    throw traceError(error, "AuthUserService : unlinkProvider");
  }
};

/**
 * Change password
 * @param {string} id
 * @param {string} newPassword
 * @returns {Promise<void>}
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
 * @returns {Promise<void>}
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
 * @returns {Promise<AuthUser>}
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
