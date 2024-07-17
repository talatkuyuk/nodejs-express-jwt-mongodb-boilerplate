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
 * @typedef {QueryWithId | QueryWithEmail} GetUserQuery
 *
 * @typedef {import('../models/user.model')} User

 */

const { ObjectId, ReturnDocument } = require("mongodb");

const mongodb = require("../core/mongodb");
const { User } = require("../models");
const { traceError } = require("../utils/errorUtils");

/**
 * Add an user into db
 * @typedef {Object} UserFieldsForCreate
 * @property {User["email"]} email
 * @property {User["role"]} role
 * @property {User["name"]} [name]
 * @property {User["gender"]} [gender]
 * @property {User["country"]} [country]
 * @property {User["createdAt"]} [createdAt]
 * @property {User["updatedAt"]} [updatedAt]
 *
 * @param {string} id
 * @param {UserFieldsForCreate} user
 * @returns {Promise<User|null>}
 */
const addUser = async (id, user) => {
  try {
    const db = mongodb.getDatabase();
    const result = await db.collection("users").insertOne({
      _id: ObjectId.createFromHexString(id),
      email: user.email,
      role: user.role,
      name: typeof user.name === "undefined" ? null : user.name,
      gender: typeof user.gender === "undefined" ? null : user.gender,
      country: typeof user.country === "undefined" ? null : user.country,
      createdAt: typeof user.createdAt === "undefined" ? Date.now() : user.createdAt,
      updatedAt: typeof user.updatedAt === "undefined" ? null : user.updatedAt,
    });

    if (!result.acknowledged) return null;

    console.log(`1 record is created in users. (${result.insertedId})`);

    // get the inserted document back
    const userInserted = await db.collection("users").findOne({ _id: result.insertedId });

    if (!userInserted) return null;

    return User.fromDoc(userInserted);
  } catch (error) {
    throw traceError(error, "UserDbService : addUser");
  }
};

/**
 * Get user by id or email
 * @param {GetUserQuery} query
 * @returns {Promise<User|null>}
 */
const getUser = async (query) => {
  try {
    const newQuery = {
      ...(query.id && { _id: ObjectId.createFromHexString(query.id) }),
      ...(query.email && { email: query.email }),
    };

    const db = mongodb.getDatabase();
    const userDoc = await db.collection("users").findOne(newQuery);

    if (!userDoc) return null;

    return User.fromDoc(userDoc);
  } catch (error) {
    throw traceError(error, "UserDbService : getUser");
  }
};

/**
 * Query for users
 * @typedef {Object} UserQueryResult
 * @property {User[]} users
 * @property {number} totalCount
 *
 * @typedef {Object} UserFieldsForFilter
 * @property {string} [email]
 * @property {string} [role]
 * @property {string} [name]
 * @property {string} [gender]
 * @property {string} [country]
 * @property {string} [createdAt]
 *
 * @typedef {Object} UserFieldsForSorting
 * @property {1|-1} [email]
 * @property {1|-1} [role]
 * @property {1|-1} [name]
 * @property {1|-1} [gender]
 * @property {1|-1} [country]
 * @property {1|-1} [createdAt]
 *
 * @param {UserFieldsForFilter} filter - Mongo filter for users
 * @param {UserFieldsForSorting} sort - Sort option in the format: { field1: 1, field2: -1}
 * @param {number} skip - Number of records skipped, refers the page
 * @param {number} limit - Maximum number of results per page (default = 20)
 * @returns {Promise<UserQueryResult>}
 */
const getUsers = async (filter, sort, skip, limit) => {
  let matchEmail = {};
  let matchName = {};
  let matchDate = {};

  const { email, name, createdAt, ...rest } = filter;

  if (email) matchEmail = { email: { $regex: email } };

  if (name) matchName = { name: { $regex: new RegExp(name, "i") } };

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
        $match: { ...matchEmail, ...matchName, ...matchDate, ...rest },
      },
      {
        $project: {
          // _id: 0,
          // id: "$_id",
          email: 1,
          role: 1,
          name: 1,
          gender: 1,
          country: 1,
          createdAt: 1,
          updatedAt: 1,
        },
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

    // facet_result ----> [{ users: [objects], total: [{ count: n }] }]
    const facet_result = await db.collection("users").aggregate(pipeline).toArray();
    const document = facet_result[0];

    if (!document) {
      return { users: [], totalCount: 0 };
    }

    /**
     * @type {import("mongodb").WithId<import("mongodb").Document>[]}
     */
    const users = document["users"];

    /**
     * @type {number}
     */
    const totalCount = document["total"].length === 0 ? 0 : document["total"][0]["count"];

    return { users: users.map(User.fromDoc), totalCount };
  } catch (error) {
    throw traceError(error, "UserDbService : getUsers");
  }
};

/**
 * Update user by id
 * @typedef {Object} UserFieldsForUpdate
 * @property {User["role"]} [role]
 * @property {User["name"]} [name]
 * @property {User["gender"]} [gender]
 * @property {User["country"]} [country]
 *
 * @param {string} id
 * @param {UserFieldsForUpdate} updateBody
 * @returns {Promise<User|null>}
 */
const updateUser = async (id, updateBody) => {
  try {
    console.log("updateUser: ", id, updateBody);

    const db = mongodb.getDatabase();
    const userDoc = await db
      .collection("users")
      .findOneAndUpdate(
        { _id: typeof id === "string" ? ObjectId.createFromHexString(id) : id },
        { $set: { ...updateBody, updatedAt: Date.now() } },
        { returnDocument: ReturnDocument.AFTER },
      );

    if (!userDoc) return null;

    console.log(`1 record is updated in users. (${id})`);

    return User.fromDoc(userDoc);
  } catch (error) {
    throw traceError(error, "UserDbService : updateUser");
  }
};

/**
 * Delete user by id
 * @param {string} id
 * @returns {Promise<User|null>}
 */
const deleteUser = async (id) => {
  try {
    console.log("deleteUser: ", id);

    const db = mongodb.getDatabase();
    const deletedUserDoc = await db.collection("users").findOneAndDelete({
      _id: ObjectId.createFromHexString(id),
    });

    if (!deletedUserDoc) return null;

    console.log(`deleteUser: The user ${id} is deleted in users`);

    const deletedUserDoc2 = await db.collection("deletedusers").insertOne({
      ...deletedUserDoc,
      deletedAt: Date.now(),
    });

    if (!deletedUserDoc2.acknowledged) {
      // do not raise error but log the issue
      console.log(`deleteUser: The user ${id} could not added into deletetedusers`);

      return null;
    }

    console.log(`1 record is created in deletedusers. ${deletedUserDoc2.insertedId}`);

    // get the inserted document back
    const deletedUserInserted = await db
      .collection("deletedusers")
      .findOne({ _id: deletedUserDoc2.insertedId });

    if (!deletedUserInserted) return null;

    return User.fromDoc(deletedUserInserted);
  } catch (error) {
    throw traceError(error, "UserDbService : deleteUser");
  }
};

/**
 * Get deleted user
 * @param {GetUserQuery} query
 * @returns {Promise<User|null>}
 */
const getDeletedUser = async (query) => {
  try {
    console.log("getDeletedUser: ", query);

    const newQuery = {
      ...(query.id && { _id: ObjectId.createFromHexString(query.id) }),
      ...(query.email && { email: query.email }),
    };

    const db = mongodb.getDatabase();
    const doc = await db.collection("deletedusers").findOne(newQuery);

    if (!doc) return null;

    return User.fromDoc(doc);
  } catch (error) {
    throw traceError(error, "UserDbService : getDeletedUser");
  }
};

module.exports = {
  addUser,
  getUser,
  getUsers,
  updateUser,
  deleteUser,
  getDeletedUser,
};
