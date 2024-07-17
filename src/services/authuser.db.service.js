/**
 * @typedef {import("mongodb").Document[]} Documents
 *
 * @typedef {Object} QueryWithId
 * @property {string} id
 * @property {string} [email]
 *
 * @typedef {Object} QueryWithEmail
 * @property {string} email
 * @property {string} [id]
 *
 * @typedef {QueryWithId | QueryWithEmail} GetAuthuserQuery
 *
 * @typedef {import('../models/authuser.model')} AuthUser
 */

const { ObjectId, ReturnDocument } = require("mongodb");

const mongodb = require("../core/mongodb");
const { AuthUser } = require("../models");
const { traceError } = require("../utils/errorUtils");

/**
 * Add an authuser into db
 * @typedef {Object} AuthuserFieldsForCreate
 * @property {AuthUser["email"]} email
 * @property {AuthUser["password"]} [password]
 * @property {AuthUser["isEmailVerified"]} [isEmailVerified]
 * @property {AuthUser["isDisabled"]} [isDisabled]
 * @property {AuthUser["providers"]} [providers]
 * @property {AuthUser["createdAt"]} [createdAt]
 * @property {AuthUser["updatedAt"]} [updatedAt]
 *
 * @param {AuthuserFieldsForCreate} authuser
 * @returns {Promise<AuthUser|null>}
 */
const addAuthUser = async (authuser) => {
  try {
    const db = mongodb.getDatabase();
    const result = await db.collection("authusers").insertOne({
      email: authuser.email,
      password: typeof authuser.password === "undefined" ? null : authuser.password,
      isEmailVerified:
        typeof authuser.isEmailVerified === "undefined" ? false : authuser.isEmailVerified,
      isDisabled: typeof authuser.isDisabled === "undefined" ? false : authuser.isDisabled,
      createdAt: typeof authuser.createdAt === "undefined" ? Date.now() : authuser.createdAt,
      updatedAt: typeof authuser.updatedAt === "undefined" ? null : authuser.updatedAt,
      ...(authuser.providers && { providers: authuser.providers }),
    });

    if (!result.acknowledged) return null;

    console.log(`1 record is created in authusers. (${result.insertedId})`);

    // get the inserted document back
    const authuserInserted = await db
      .collection("authusers")
      .findOne({ _id: result.insertedId });

    if (!authuserInserted) return null;

    return AuthUser.fromDoc(authuserInserted);
  } catch (error) {
    throw traceError(error, "AuthUserDbService : addAuthUser");
  }
};

/**
 * Get authuser by id or email
 *
 * @param {GetAuthuserQuery} query
 * @returns {Promise<AuthUser|null>}
 */
const getAuthUser = async (query) => {
  try {
    const newQuery = {
      ...(query.id && { _id: ObjectId.createFromHexString(query.id) }),
      ...(query.email && { email: query.email }),
    };

    const db = mongodb.getDatabase();
    const authuserDoc = await db.collection("authusers").findOne(newQuery);

    if (!authuserDoc) return null;

    return AuthUser.fromDoc(authuserDoc);
  } catch (error) {
    throw traceError(error, "AuthUserDbService : getAuthUser");
  }
};

/**
 * Query for authusers
 * @typedef {Object} AuthuserQueryResult
 * @property {AuthUser[]} authusers
 * @property {number} totalCount
 *
 * @typedef {Object} AuthuserFieldsForFilter
 * @property {string} [email]
 * @property {boolean} [isEmailVerified]
 * @property {boolean} [isDisabled]
 * @property {string} [createdAt]
 *
 * @typedef {Object} AuthuserFieldsForSorting
 * @property {1|-1} [email]
 * @property {1|-1} [isEmailVerified]
 * @property {1|-1} [isDisabled]
 * @property {1|-1} [createdAt]
 *
 * @param {AuthuserFieldsForFilter} filter - Filter fields for authusers
 * @param {AuthuserFieldsForSorting} sort - { field1: 1, field2: -1}
 * @param {number} skip - Number of records skipped, refers the page
 * @param {number} limit - Maximum number of results per page (default = 20)
 * @returns {Promise<AuthuserQueryResult>}
 */
const getAuthUsers = async (filter, sort, skip, limit) => {
  let matchEmail = {};
  let matchDate = {};

  const { email, createdAt, ...rest } = filter;

  if (email) matchEmail = { email: { $regex: email } };

  if (createdAt) {
    var [startDate, endDate] = createdAt.split("-");

    const parsedStartDate = Date.parse(startDate); // unix timestamp
    const parsedEndDate = Date.parse(endDate); // unix timestamp

    const isDateStart = !isNaN(parsedStartDate);
    const isDateEnd = !isNaN(parsedEndDate);

    if (isDateStart && isDateEnd) {
      matchDate = {
        createdAt: {
          $gte: parsedStartDate,
          $lte: parsedEndDate,
        },
      };
    } else if (isDateStart) {
      matchDate = {
        createdAt: {
          $gte: parsedStartDate,
        },
      };
    } else if (isDateEnd) {
      matchDate = {
        createdAt: {
          $lte: parsedEndDate,
        },
      };
    }
  }

  try {
    const pipeline = [
      {
        $match: { ...matchEmail, ...matchDate, ...rest },
      },
      {
        $project: {
          // _id: 0,
          // id: "$_id",
          email: 1,
          isEmailVerified: 1,
          isDisabled: 1,
          providers: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
      {
        $sort: sort,
      },
      {
        $facet: {
          authusers: [
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

    // facet_result ----> [{ authusers: [objects], total: [{ count: n }] }]
    const facet_result = await db.collection("authusers").aggregate(pipeline).toArray();
    const document = facet_result[0];

    if (!document) {
      return { authusers: [], totalCount: 0 };
    }

    console.log({ document });

    /**
     * @type {import("mongodb").WithId<import("mongodb").Document>[]}
     */
    const authusers = document["authusers"];

    /**
     * @type {number}
     */
    const totalCount = document["total"].length === 0 ? 0 : document["total"][0]["count"];

    return { authusers: authusers.map(AuthUser.fromDoc), totalCount };
  } catch (error) {
    throw traceError(error, "AuthUserDbService : getAuthUsers");
  }
};

/**
 * Update authuser by id
 * @typedef {Object} AuthuserFieldsForUpdate
 * @property {AuthUser["email"]} [email]
 * @property {AuthUser["password"]} [password]
 * @property {AuthUser["isEmailVerified"]} [isEmailVerified]
 * @property {AuthUser["isDisabled"]} [isDisabled]
 * @property {AuthUser["providers"]} [providers]
 *
 * @param {string} id
 * @param {AuthuserFieldsForUpdate} updateBody
 * @returns {Promise<AuthUser|null>}
 */
const updateAuthUser = async (id, updateBody) => {
  try {
    console.log("updateAuthUser: ", id, updateBody);

    const db = mongodb.getDatabase();
    const authuserDoc = await db
      .collection("authusers")
      .findOneAndUpdate(
        { _id: ObjectId.createFromHexString(id) },
        { $set: { ...updateBody, updatedAt: Date.now() } },
        { returnDocument: ReturnDocument.AFTER },
      );

    if (!authuserDoc) return null;

    console.log(`1 record is updated in authusers. (${id})`);

    return AuthUser.fromDoc(authuserDoc);
  } catch (error) {
    throw traceError(error, "AuthUserDbService : updateAuthUser");
  }
};

/**
 * Delete authuser by id
 * @param {string} id
 * @returns {Promise<AuthUser|null>}
 */
const deleteAuthUser = async (id) => {
  try {
    console.log("deleteAuthUser: ", id);

    const db = mongodb.getDatabase();
    const deletedAuthuserDoc = await db.collection("authusers").findOneAndDelete({
      _id: ObjectId.createFromHexString(id),
    });

    if (!deletedAuthuserDoc) return null;

    console.log(`deleteAuthUser: The authuser ${id} is deleted in authusers`);

    const deletedAuthuserDoc2 = await db.collection("deletedauthusers").insertOne({
      ...deletedAuthuserDoc,
      deletedAt: Date.now(),
    });

    if (!deletedAuthuserDoc2.acknowledged) {
      // do not raise error but log the issue
      console.log(`deleteAuthUser: The authuser ${id} could not added into deletedauthusers`);

      return null;
    }

    console.log(`1 record is created in deletedauthusers. ${deletedAuthuserDoc2.insertedId}`);

    // get the inserted document back
    const deletedAuthuserInserted = await db
      .collection("deletedauthusers")
      .findOne({ _id: deletedAuthuserDoc2.insertedId });

    if (!deletedAuthuserInserted) return null;

    return AuthUser.fromDoc(deletedAuthuserInserted);
  } catch (error) {
    throw traceError(error, "AuthUserDbService : deleteAuthUser");
  }
};

/**
 * Get deleted authuser
 *
 * @param {GetAuthuserQuery} query
 * @returns {Promise<AuthUser|null>}
 */
const getDeletedAuthUser = async (query) => {
  try {
    console.log("getDeletedAuthUser: ", query);

    const newQuery = {
      ...(query.id && { _id: ObjectId.createFromHexString(query.id) }),
      ...(query.email && { email: query.email }),
    };

    const db = mongodb.getDatabase();
    const doc = await db.collection("deletedauthusers").findOne(newQuery);

    if (!doc) return null;

    return AuthUser.fromDoc(doc);
  } catch (error) {
    throw traceError(error, "AuthUserDbService : getDeletedAuthUser");
  }
};

module.exports = {
  addAuthUser,
  getAuthUser,
  getAuthUsers,
  updateAuthUser,
  deleteAuthUser,
  getDeletedAuthUser,
};
