/**
 * @typedef {import("mongodb").WithId<import("mongodb").Document>[]} Documents
 * @typedef {import('../models/authuser.model')} AuthUser
 * @typedef {import('../models/user.model')} User
 */

const mongodb = require("../core/mongodb");
const ObjectId = require("mongodb").ObjectId;

const { traceError } = require("../utils/errorUtils");
const { AuthUser, User } = require("../models");

/**
 * @typedef {Object} AuthuserAndUser
 * @property {AuthUser|undefined} authuser
 * @property {User|undefined} user
 *
 * Get authuser and user together by id
 * @param {string} id
 * @returns {Promise<AuthuserAndUser>}
 */
const getAuthUserJoined = async (id) => {
  try {
    const pipeline = [
      {
        $match: { _id: ObjectId.createFromHexString(id) },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "details",
        },
      },
      { $unwind: { path: "$details", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          email: 1,
          password: 1,
          isEmailVerified: 1,
          isDisabled: 1,
          providers: 1,
          createdAt: 1,
          user: "$details",
        },
      },
    ];

    const db = mongodb.getDatabase();
    const agregate_result = await db.collection("authusers").aggregate(pipeline).toArray();

    console.log({ agregate_result });

    const document = /** @type {import("mongodb").WithId<import("mongodb").Document>} */ (
      agregate_result[0]
    );

    console.log({ document });

    if (!document) {
      return {
        authuser: undefined,
        user: undefined,
      };
    }

    return {
      authuser: AuthUser.fromDoc(document),
      user: document["user"] ? User.fromDoc(document["user"]) : undefined,
    };
  } catch (error) {
    throw traceError(error, "JoinedDbService : getAuthUserJoined");
  }
};
/**
 * Query for authusers with left outer joined on users
 * @param {Object} filterLeft - Mongo filter for authusers
 * @param {Object} filterRight - Mongo filter for users
 * @param {Object} sort - Sort option in the format: { field1: 1, field2: -1}
 * @param {number} skip - Number of records skipped, refers the page
 * @param {number} limit - Maximum number of results per page (default = 20)
 * @returns {Promise<Documents>}
 */
const getAuthUsersJoined = async (filterLeft, filterRight, sort, skip, limit) => {
  try {
    const pipeline = [
      {
        $match: filterLeft,
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "details",
        },
      },
      {
        $unwind: { path: "$details", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          _id: 0,
          id: "$_id",
          email: 1,
          isEmailVerified: 1,
          isDisabled: 1,
          providers: 1,
          createdAt: 1,
          role: "$details.role",
          name: "$details.name",
          gender: "$details.gender",
          country: "$details.country",
        },
      },
      {
        $match: filterRight,
      },
      {
        $sort: sort,
      },
      {
        $facet: {
          users: [
            {
              $skip: skip,
            },
            {
              $limit: limit,
            },
          ],
          total: [
            {
              $count: "count",
            },
          ],
        },
      },
    ];

    const db = mongodb.getDatabase();
    const agregate_result = await db.collection("authusers").aggregate(pipeline).toArray();

    const documents = /** @type {import("mongodb").WithId<import("mongodb").Document>[]} */ (
      agregate_result[0]
    );

    return documents;
  } catch (error) {
    throw traceError(error, "JoinedDbService : getAuthUsersJoined");
  }
};

/**
 * Query for users with left outer joined on authusers
 * @param {Object} filterLeft - Mongo filter for users
 * @param {Object} filterRight - Mongo filter for authusers
 * @param {Object} sort - Sort option in the format: { field1: 1, field2: -1}
 * @param {number} skip - Number of records skipped, refers the page
 * @param {number} limit - Maximum number of results per page (default = 20)
 * @returns {Promise<Documents>}
 */
const getUsersJoined = async (filterLeft, filterRight, sort, skip, limit) => {
  try {
    const pipeline = [
      {
        $match: filterLeft,
      },
      {
        $lookup: {
          from: "authusers",
          localField: "_id",
          foreignField: "_id",
          as: "details",
        },
      },
      {
        $unwind: { path: "$details", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          _id: 0,
          id: "$_id",
          email: 1,
          role: 1,
          name: 1,
          gender: 1,
          country: 1,
          createdAt: 1,
          isEmailVerified: "$details.isEmailVerified",
          isDisabled: "$details.isDisabled",
          providers: "$details.providers",
        },
      },
      {
        $match: filterRight,
      },
      {
        $sort: sort,
      },
      {
        $facet: {
          users: [
            {
              $skip: skip,
            },
            {
              $limit: limit,
            },
          ],
          total: [
            {
              $count: "count",
            },
          ],
        },
      },
    ];

    const db = mongodb.getDatabase();
    const agregate_result = await db.collection("ßusers").aggregate(pipeline).toArray();

    const documents = /** @type {import("mongodb").WithId<import("mongodb").Document>[]} */ (
      agregate_result[0]
    );

    return documents;
  } catch (error) {
    throw traceError(error, "JoinedDbService : getUsersJoined");
  }
};

module.exports = {
  getAuthUserJoined,
  getAuthUsersJoined,
  getUsersJoined,
};
