const mongodb = require("../core/mongodb");
const { ObjectId, ReturnDocument } = require("mongodb");

const { AuthUser } = require("../models");
const { traceError } = require("../utils/errorUtils");

/**
 * Add an authuser into db
 * @param {AuthUser} authuser
 * @returns {Promise<AuthUser?>}
 */
const addAuthUser = async (authuser) => {
  try {
    const db = mongodb.getDatabase();
    const result = await db.collection("authusers").insertOne(authuser);

    if (!result.acknowledged) return null;

    console.log(`1 record is created in authusers. (${result.insertedId})`);

    // get the inserted document back
    const authuserInserted = await db
      .collection("authusers")
      .findOne({ _id: result.insertedId });

    return AuthUser.fromDoc(authuserInserted);
  } catch (error) {
    throw traceError(error, "AuthUserDbService : addAuthUser");
  }
};

/**
 * Get authuser
 * @param {Object} query {id | email}
 * @returns {Promise<AuthUser>}
 */
const getAuthUser = async (query) => {
  try {
    if (query.id) {
      query = { ...query, _id: ObjectId.createFromHexString(query.id) };
      delete query.id;
    }

    const db = mongodb.getDatabase();
    const doc = await db.collection("authusers").findOne(query);

    return AuthUser.fromDoc(doc);
  } catch (error) {
    throw traceError(error, "AuthUserDbService : getAuthUser");
  }
};

/**
 * Query for authusers
 * @param {Object} filter - Filter fields for authusers
 * @param {Object} sort - Sort option in the format: { field1: 1, field2: -1}
 * @param {number} limit - Maximum number of results per page (default = 20)
 * @param {number} page - Current page (default = 1)
 * @returns {Promise<QueryResult>}
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

    isDateStart = !isNaN(parsedStartDate);
    isDateEnd = !isNaN(parsedEndDate);

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
          _id: 0,
          id: "$_id",
          email: 1,
          isEmailVerified: 1,
          isDisabled: 1,
          createdAt: 1,
          updatedAt: 1,
          providers: 1,
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
    return await db.collection("authusers").aggregate(pipeline).toArray();
  } catch (error) {
    throw traceError(error, "AuthUserDbService : getAuthUsers");
  }
};

/**
 * Update authuser by id
 * @param {string | ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<AuthUser?>}
 */
const updateAuthUser = async (id, updateBody) => {
  try {
    console.log("updateAuthUser: ", id, updateBody);

    const db = mongodb.getDatabase();
    const result = await db
      .collection("authusers")
      .findOneAndUpdate(
        { _id: typeof id === "string" ? ObjectId.createFromHexString(id) : id },
        { $set: { ...updateBody, updatedAt: Date.now() } },
        { returnDocument: ReturnDocument.AFTER }
      );

    const count = result === null ? 0 : 1;
    console.log(`${count} record is updated in authusers. (${id})`);

    return AuthUser.fromDoc(result);
  } catch (error) {
    throw traceError(error, "AuthUserDbService : updateAuthUser");
  }
};

/**
 * Delete authuser by id
 * @param {string | ObjectId} id
 * @returns {Promise<boolean>}
 */
const deleteAuthUser = async (id) => {
  try {
    console.log("deleteAuthUser: ", id);

    const db = mongodb.getDatabase();
    const result = await db.collection("authusers").findOneAndDelete({
      _id: typeof id === "string" ? ObjectId.createFromHexString(id) : id,
    });

    if (!result) return false;

    console.log(`deleteAuthUser: The authuser ${id} is deleted in authusers`);

    const authuser = AuthUser.fromDoc(result);

    const result2 = await toDeletedAuthUsers(authuser);
    if (result2 == null) {
      // do not raise error but log the issue
      console.log(
        `deleteAuthUser: The authuser ${id} could not added into deletedauthusers`
      );
    }

    return true;
  } catch (error) {
    throw traceError(error, "AuthUserDbService : deleteAuthUser");
  }
};

/**
 * Add the deleted authuser to the deletedauthusers
 * @param {AuthUser} deletedAuthUser
 * @returns {Promise<AuthUser?>}
 */
const toDeletedAuthUsers = async (deletedAuthUser) => {
  try {
    console.log("toDeletedAuthUsers: ", deletedAuthUser.id);

    deletedAuthUser["_id"] = ObjectId.createFromHexString(deletedAuthUser.id);
    delete deletedAuthUser.id;
    deletedAuthUser["deletedAt"] = Date.now();

    const db = mongodb.getDatabase();
    const result = await db
      .collection("deletedauthusers")
      .insertOne(deletedAuthUser);

    if (!result.acknowledged) return null;

    console.log(
      `1 record is created in deletedauthusers. ${result.insertedId}`
    );

    // get the inserted document back
    const deletedAuthuserInserted = await db
      .collection("deletedauthusers")
      .findOne({ _id: result.insertedId });

    return deletedAuthuserInserted;
  } catch (error) {
    throw traceError(error, "AuthUserDbService : toDeletedAuthUsers");
  }
};

/**
 * Get deleted authuser
 * @param {Object} query {id | email}
 * @returns {Promise<AuthUser?>}
 */
const getDeletedAuthUser = async (query) => {
  try {
    console.log("getDeletedAuthUser: ", query);

    if (query.id) {
      query = { ...query, _id: ObjectId.createFromHexString(query.id) };
      delete query.id;
    }

    const db = mongodb.getDatabase();
    const doc = await db.collection("deletedauthusers").findOne(query);

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
