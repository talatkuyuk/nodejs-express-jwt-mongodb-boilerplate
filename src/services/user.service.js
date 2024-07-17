/** @typedef {import('../models/user.model')} User */

const httpStatus = require("http-status");

const ApiError = require("../utils/ApiError");
const { traceError } = require("../utils/errorUtils");
const { User } = require("../models");

// SERVICE DEPENDENCIES
const paginaryService = require("./paginary.service");
const userDbService = require("./user.db.service");

/////////////////////////  UTILS  ///////////////////////////////////////

/**
 * Check if the user exists
 * @param {string} id
 * @returns {Promise<Boolean>}
 */
const isExist = async function (id) {
  try {
    const user = await userDbService.getUser({ id });

    return !!user;
  } catch (error) {
    throw traceError(error, "UserService : isExist");
  }
};

/////////////////////////////////////////////////////////////////////

/**
 * Add user with the same authuser.id
 * @typedef {Object} AddUserBody
 * @property {string} email
 * @property {"user"|"admin"} role
 * @property {string} [name]
 * @property {string} [gender]
 * @property {string} [country]
 *
 * @param {string} id
 * @param {AddUserBody} addBody
 * @returns {Promise<User>}
 */
const addUser = async (id, addBody) => {
  try {
    const user = await userDbService.addUser(id, addBody);

    if (!user) {
      throw new ApiError(httpStatus.BAD_REQUEST, "The database could not process the request");
    }

    return user;
  } catch (error) {
    throw traceError(error, "UserService : addUser");
  }
};

/**
 * Get User by id
 * @param {string} id
 * @returns {Promise<User>}
 */
const getUserById = async (id) => {
  try {
    const user = await userDbService.getUser({ id });

    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, "No user found");
    }

    return user;
  } catch (error) {
    throw traceError(error, "UserService : getUserById");
  }
};

/**
 * Get User by email
 * @param {string} email
 * @returns {Promise<User>}
 */
const getUserByEmail = async (email) => {
  try {
    const user = await userDbService.getUser({ email });

    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, "No user found");
    }

    return user;
  } catch (error) {
    throw traceError(error, "UserService : getUserByEmail");
  }
};

/**
 * Get Users in a paginary
 * @typedef {Object} UserQuery
 * @property {string} [email]
 * @property {string} [role]
 * @property {string} [name]
 * @property {string} [gender]
 * @property {string} [country]
 * @property {string} [createdAt]
 * @property {string} page
 * @property {string} size
 * @property {string} sort
 *
 * @typedef {Object} UserQueryResult
 * @property {User[]} users
 * @property {number} totalCount
 * @property {import('./paginary.service').Pagination} pagination
 *
 * @param {UserQuery} query
 * @returns {Promise<UserQueryResult>}
 */
const getUsers = async (query) => {
  try {
    const filter = paginaryService.composeFilter(query, {
      stringFields: ["email", "role", "name", "country", "gender", "createdAt"],
    });

    const sortingFields = ["email", "role", "name", "country", "gender", "createdAt"];
    const sort = paginaryService.composeSort(query.sort, sortingFields);

    const { page, skip, limit } = paginaryService.composePaginationFactors(
      query.page,
      query.size,
    );

    console.log({ filter, sort, page, skip, limit });

    const { users, totalCount } = await userDbService.getUsers(filter, sort, skip, limit);

    const pagination = paginaryService.composePagination(totalCount, page, limit);

    return {
      users,
      totalCount,
      pagination,
    };
  } catch (error) {
    throw traceError(error, "UserService : getUsers");
  }
};

/**
 * Update user by id
 * @typedef {Object} UpdateUserBody
 * @property {"user"|"admin"} [role]
 * @property {string} [name]
 * @property {string} [gender]
 * @property {string} [country]
 *
 * @param {string} id
 * @param {UpdateUserBody} updateBody
 * @returns {Promise<User>}
 */
const updateUser = async (id, updateBody) => {
  try {
    const user = await userDbService.updateUser(id, updateBody);

    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, "No user found");
    }

    return user;
  } catch (error) {
    throw traceError(error, "UserService : updateUser");
  }
};

/**
 * Delete User
 * @param {string} id
 * @returns {Promise<void>}
 */
const deleteUser = async (id) => {
  try {
    const result = await userDbService.deleteUser(id);

    if (!result) {
      throw new ApiError(httpStatus.NOT_FOUND, "No user found");
    }
  } catch (error) {
    throw traceError(error, "UserService : deleteUser");
  }
};

/**
 * Get Deleted User by id
 * @param {string} id
 * @returns {Promise<User|null>}
 */
const getDeletedUserById = async (id) => {
  try {
    const user = await userDbService.getDeletedUser({ id });

    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, "No user found");
    }

    return user;
  } catch (error) {
    throw traceError(error, "UserService : getDeletedUserById");
  }
};

module.exports = {
  isExist,

  addUser,
  getUserById,
  getUserByEmail,
  getUsers,
  updateUser,
  deleteUser,
  getDeletedUserById,
};
