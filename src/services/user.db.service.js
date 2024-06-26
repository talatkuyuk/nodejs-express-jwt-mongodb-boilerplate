const mongodb = require("../core/mongodb");
const { ObjectId, ReturnDocument } = require("mongodb");

const { User } = require("../models");
const { traceError } = require("../utils/errorUtils");

/**
 * Add an user into db
 * @param {String} id
 * @param {User} user
 * @returns {Promise<User?>}
 */
const addUser = async (id, user) => {
  try {
    const db = mongodb.getDatabase();
    const result = await db.collection("users").insertOne({
      _id: ObjectId.createFromHexString(id),
      ...user,
    });

    if (!result.acknowledged) return null;

    console.log(`1 record is created in users. (${result.insertedId})`);

    // get the inserted document back
    const userInserted = await db
      .collection("users")
      .findOne({ _id: result.insertedId });

    return User.fromDoc(userInserted);
  } catch (error) {
    throw traceError(error, "UserDbService : addUser");
  }
};

/**
 * Get user
 * @param {Object} query
 * @returns {Promise<User>}
 */
const getUser = async (query) => {
  try {
    if (query.id) {
      query = { ...query, _id: ObjectId.createFromHexString(query.id) };
      delete query.id;
    }

    const db = mongodb.getDatabase();
    const doc = await db.collection("users").findOne(query);

    return User.fromDoc(doc);
  } catch (error) {
    throw traceError(error, "UserDbService : getUser");
  }
};

/**
 * Query for users
 * @param {Object} filter - Mongo filter for users
 * @param {Object} sort - Sort option in the format: { field1: 1, field2: -1}
 * @param {number} limit - Maximum number of results per page (default = 20)
 * @param {number} page - Current page (default = 1)
 * @returns {Promise<QueryResult>}
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
        $match: { ...matchEmail, ...matchName, ...matchDate, ...rest },
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
    return await db.collection("users").aggregate(pipeline).toArray();
  } catch (error) {
    throw traceError(error, "UserDbService : getUsers");
  }
};

/**
 * Update user by id
 * @param {string | ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<User?>}
 */
const updateUser = async (id, updateBody) => {
  try {
    console.log("updateUser: ", id, updateBody);

    const db = mongodb.getDatabase();
    const result = await db
      .collection("users")
      .findOneAndUpdate(
        { _id: typeof id === "string" ? ObjectId.createFromHexString(id) : id },
        { $set: { ...updateBody, updatedAt: Date.now() } },
        { returnDocument: ReturnDocument.AFTER }
      );

    const count = result == null ? 0 : 1;
    console.log(`${count} record is updated in users`);

    return User.fromDoc(result);
  } catch (error) {
    throw traceError(error, "UserDbService : updateUser");
  }
};

/**
 * Delete user by id
 * @param {string | ObjectId} id
 * @returns {Promise<boolean>}
 */
const deleteUser = async (id) => {
  try {
    console.log("deleteUser: ", id);

    const db = mongodb.getDatabase();
    const result = await db.collection("users").findOneAndDelete({
      _id: typeof id === "string" ? ObjectId.createFromHexString(id) : id,
    });

    if (!result) return false;

    console.log(`deleteUser: The user ${id} is deleted in users`);

    const user = User.fromDoc(result);

    const result2 = await toDeletedUsers(user);
    if (result2 == null) {
      // do not raise error but log the issue
      console.log(
        `deleteUser: The user ${id} could not added into deletetedusers`
      );
    }

    return true;
  } catch (error) {
    throw traceError(error, "UserDbService : deleteUser");
  }
};

/**
 * Add the deleted user to the deletedusers
 * @param {User} deletedUser
 * @returns {Promise<User?>}
 */
const toDeletedUsers = async (deletedUser) => {
  try {
    console.log("toDeletedAuthUsers: ", deletedUser.id);

    deletedUser["_id"] = ObjectId.createFromHexString(deletedUser.id);
    delete deletedUser.id;
    deletedUser["deletedAt"] = Date.now();

    const db = mongodb.getDatabase();
    const result = await db.collection("deletedusers").insertOne(deletedUser);

    if (!result.acknowledged) return null;

    console.log(`1 record is created in deletedusers. ${result.insertedId}`);

    // get the inserted document back
    const deletedUserInserted = await db
      .collection("deletedusers")
      .findOne({ _id: result.insertedId });

    return deletedUserInserted;
  } catch (error) {
    throw traceError(error, "UserDbService : toDeletedUsers");
  }
};

/**
 * Get deleted user
 * @param {Object} query
 * @returns {Promise<User?>}
 */
const getDeletedUser = async (query) => {
  try {
    console.log("getDeletedUser: ", query);

    if (query.id) {
      query = { ...query, _id: ObjectId.createFromHexString(query.id) };
      delete query.id;
    }

    const db = mongodb.getDatabase();
    const doc = await db.collection("deletedusers").findOne(query);

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
