/** @typedef {import('../models/authuser.model')} AuthUser */
/** @typedef {import("mongodb").WithId<import("mongodb").Document>[]} Documents */

const { traceError } = require("../utils/errorUtils");

const joinedDbService = require("./joined.db.service");
const paginaryService = require("./paginary.service");

// I created this service for joined queries for admin users, but actually it is not necessary.
// My concept aims normally to seperate authuser and authentication feature from user and related processes

/**
 * Get AuthUsers Joined with Users in a paginary
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
 * @returns {Promise<Documents>}
 */
const getAuthUsersJoined = async (query) => {
  try {
    const filterLeft = paginaryService.composeFilter(query, {
      stringFields: ["email"],
      booleanFields: ["isEmailVerified", "isDisabled"],
    });

    const filterRight = paginaryService.composeFilter(query, {
      stringFields: ["role", "name", "country", "gender"],
    });

    const sortingFields = [
      "email",
      "role",
      "name",
      "country",
      "gender",
      "isEmailVerified",
      "isDisabled",
    ];

    const sort = paginaryService.composeSort(query.sort, sortingFields);

    const { page, skip, limit } = paginaryService.composePaginationFactors(
      query.page,
      query.size,
    );

    console.log({ filterLeft, filterRight, sort, page, skip, limit });

    const authusers = await joinedDbService.getAuthUsersJoined(
      filterLeft,
      filterRight,
      sort,
      skip,
      limit,
    );

    return authusers;
  } catch (error) {
    throw traceError(error, "JoinedService : getAuthUsersJoined");
  }
};

/**
 * Get Users Joined with Authusers in a paginary
 * @param {AuthuserQuery} query
 * @returns {Promise<Documents>}
 */
const getUsersJoined = async (query) => {
  try {
    const filterLeft = paginaryService.composeFilter(query, {
      stringFields: ["email", "role", "name", "country", "gender"],
    });
    const filterRight = paginaryService.composeFilter(query, {
      booleanFields: ["isEmailVerified", "isDisabled"],
    });

    const sortingFields = [
      "email",
      "role",
      "name",
      "country",
      "gender",
      "isEmailVerified",
      "isDisabled",
    ];
    const sort = paginaryService.composeSort(query.sort, sortingFields);

    const { page, skip, limit } = paginaryService.composePaginationFactors(
      query.page,
      query.size,
    );

    console.log({ filterLeft, filterRight, sort, page, skip, limit });

    const users = await joinedDbService.getUsersJoined(
      filterLeft,
      filterRight,
      sort,
      skip,
      limit,
    );

    return users;
  } catch (error) {
    throw traceError(error, "JoinedService : getUsersJoined");
  }
};

module.exports = {
  getAuthUsersJoined,
  getUsersJoined,
};
