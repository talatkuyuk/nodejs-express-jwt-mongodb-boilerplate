const { traceError } = require("../utils/errorUtils");
const composeFilter = require("../utils/composeFilter");
const composeSort = require("../utils/composeSort");

const joinedDbService = require("./joined.db.service");
const paginaryService = require("./paginary.service");

// I created this service for joined queries for admin users, but actually it is not necessary.
// My concept aims normally to seperate authuser and authentication feature from user and related processes

/**
 * Get AuthUsers Joined with Users in a paginary
 * @param {Object} query
 * @returns {Promise<Object>}
 */
const getAuthUsersJoined = async (query) => {
  try {
    const fieldsLeft = {
      stringFields: ["email"],
      booleanFields: ["isEmailVerified", "isDisabled"],
    };

    const fieldsRight = {
      stringFields: ["role", "name", "country", "gender"],
    };

    const filterLeft = composeFilter(query, fieldsLeft);
    const filterRight = composeFilter(query, fieldsRight);

    const sortingFields = [
      "email",
      "role",
      "name",
      "country",
      "gender",
      "isEmailVerified",
      "isDisabled",
    ];
    const sort = composeSort(query, sortingFields);

    return await paginaryService.paginaryForJoinQuery(
      query,
      filterLeft,
      filterRight,
      sort,
      joinedDbService.getAuthUsersJoined
    );
  } catch (error) {
    throw traceError(error, "JoinedService : getAuthUsersJoined");
  }
};

/**
 * Get Users Joined with Authusers in a paginary
 * @param {Object} query
 * @returns {Promise<Object>}
 */
const getUsersJoined = async (query) => {
  try {
    const fieldsLeft = {
      stringFields: ["email", "role", "name", "country", "gender"],
    };

    const fieldsRight = {
      booleanFields: ["isEmailVerified", "isDisabled"],
    };

    const filterLeft = composeFilter(query, fieldsLeft);
    const filterRight = composeFilter(query, fieldsRight);

    const sortingFields = [
      "email",
      "role",
      "name",
      "country",
      "gender",
      "isEmailVerified",
      "isDisabled",
    ];
    const sort = composeSort(query, sortingFields);

    return await paginaryService.paginaryForJoinQuery(
      query,
      filterLeft,
      filterRight,
      sort,
      joinedDbService.getUsersJoined
    );
  } catch (error) {
    throw traceError(error, "JoinedService : getUsersJoined");
  }
};

module.exports = {
  getAuthUsersJoined,
  getUsersJoined,
};
