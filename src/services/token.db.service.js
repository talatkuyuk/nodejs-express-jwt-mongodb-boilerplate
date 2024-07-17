/** @typedef {import('../models/token.model')} Token */

const mongodb = require("../core/mongodb");
const { ObjectId, ReturnDocument } = require("mongodb");

const { Token } = require("../models");
const { traceError } = require("../utils/errorUtils");

// https://github.com/mongodb/specifications/blob/master/source/crud/crud.rst#write-results
// https://mongodb.github.io/node-mongodb-native/4.2/
// https://mongodb.github.io/node-mongodb-native/3.6/reference/unified-topology/

/**
 * Save the token to db
 * @typedef {Object} TokenFields
 * @property {Token["token"]} token
 * @property {Token["user"]} user
 * @property {Token["expires"]} expires
 * @property {Token["type"]} type
 * @property {Token["jti"]} [jti]
 * @property {Token["family"]} [family]
 * @property {Token["blacklisted"]} [blacklisted]
 * @property {Token["createdAt"]} [createdAt]
 * @property {Token["updatedAt"]} [updatedAt]
 *
 * @param {TokenFields} token
 * @returns {Promise<Token|null>}
 */
const addToken = async (token) => {
  try {
    const db = mongodb.getDatabase();
    const result = await db.collection("tokens").insertOne({
      token: token.token,
      user: ObjectId.createFromHexString(token.user),
      expires: token.expires,
      type: token.type,
      jti: typeof token.jti === "undefined" ? "n/a" : token.jti,
      family: typeof token.family === "undefined" ? "n/a" : token.family,
      blacklisted: typeof token.blacklisted === "undefined" ? false : token.blacklisted,
      createdAt: typeof token.createdAt === "undefined" ? Date.now() : token.createdAt,
      updatedAt: typeof token.updatedAt === "undefined" ? null : token.updatedAt,
    });

    if (!result.acknowledged) return null;

    console.log(`1 record is created in tokens. (${result.insertedId})`);

    // get the inserted document back
    const tokenInserted = await db.collection("tokens").findOne({ _id: result.insertedId });

    if (!tokenInserted) return null;

    return Token.fromDoc(tokenInserted);
  } catch (error) {
    throw traceError(error, "TokenDbService : addToken");
  }
};

/**
 * Get the token from db
 * @param {Partial<TokenFields>} query
 * @returns {Promise<Token|null>}
 */
const getToken = async (query) => {
  try {
    console.log("getToken: ", query);

    const { user, ...rest } = query;

    const db = mongodb.getDatabase();
    const result = await db.collection("tokens").findOne({
      ...(user && { user: ObjectId.createFromHexString(user) }),
      ...rest,
    });

    if (!result) return null;

    return Token.fromDoc(result);
  } catch (error) {
    throw traceError(error, "TokenDbService : getToken");
  }
};

/**
 * Get the tokens from db
 * @param {Partial<TokenFields>} query
 * @returns {Promise<Token[]>}
 */
const getTokens = async (query) => {
  try {
    console.log("getTokens: ", query);

    const { user, ...rest } = query;

    const db = mongodb.getDatabase();
    const tokens = await db
      .collection("tokens")
      .find({
        ...(user && { user: ObjectId.createFromHexString(user) }),
        ...rest,
      })
      .toArray();

    return tokens.map(Token.fromDoc);
  } catch (error) {
    throw traceError(error, "TokenDbService : getTokens");
  }
};

/**
 * Update the token by id in db
 * @param {string} id
 * @param {Partial<TokenFields>} updateBody
 * @returns {Promise<Token|null>}
 */
const updateToken = async (id, updateBody) => {
  try {
    console.log("updateToken: ", id, updateBody);

    const db = mongodb.getDatabase();

    const result = await db
      .collection("tokens")
      .findOneAndUpdate(
        { _id: ObjectId.createFromHexString(id) },
        { $set: { ...updateBody, updatedAt: Date.now() } },
        { returnDocument: ReturnDocument.AFTER },
      );

    if (!result) return null;

    console.log(`${result._id} record is updated in tokens`);

    return Token.fromDoc(result);
  } catch (error) {
    throw traceError(error, "TokenDbService : updateToken");
  }
};

/**
 * Delete the token from db
 * @param {string} id
 * @returns {Promise<void>}
 */
const deleteToken = async (id) => {
  try {
    console.log("deleteToken: ", id);

    const db = mongodb.getDatabase();
    const result = await db.collection("tokens").deleteOne({
      _id: ObjectId.createFromHexString(id),
    });

    if (result.acknowledged) {
      console.log(`${result.deletedCount} token deleted.`);
    } else {
      console.log("No token is deleted.");
    }
  } catch (error) {
    throw traceError(error, "TokenDbService : deleteToken");
  }
};

/**
 * Delete the tokens from db
 * @param {Partial<TokenFields>} query
 * @returns {Promise<void>}
 */
const deleteTokens = async (query) => {
  try {
    console.log("deleteTokens: ", query);

    const { user, ...rest } = query;

    const db = mongodb.getDatabase();
    const result = await db.collection("tokens").deleteMany({
      ...(user && { user: ObjectId.createFromHexString(user) }),
      ...rest,
    });

    if (result.acknowledged) {
      console.log(`${result.deletedCount} token(s) deleted.`);
    } else {
      console.log("No token deleted.");
    }
  } catch (error) {
    throw traceError(error, "TokenDbService : deleteTokens");
  }
};

module.exports = {
  addToken,
  getToken,
  getTokens,
  updateToken,
  deleteToken,
  deleteTokens,
};
