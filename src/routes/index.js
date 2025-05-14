const express = require("express");
const router = express.Router();
//const router = express.Router({ strict: true });

const { status: httpStatus } = require("http-status");

const authRoute = require("./auth.route");
const authuserRoute = require("./authuser.route");
const userRoute = require("./user.route");
const joinedRoute = require("./joined.route");
const docsRoute = require("./docs.route");
const newslatterRoute = require("./newslatter.route");

const mongodb = require("../core/mongodb");
const redis = require("../core/redis");
const config = require("../config");
const { traceError } = require("../utils/errorUtils");

// for testing purpose in development environment
router.get(
  "/list",
  /**
   * @param {import('express').Request} _req
   * @param {import('express').Response} res
   */
  async (_req, res) => {
    try {
      if (config.env === "development") {
        var database = mongodb.getDatabase();

        /** @type {Record<string, import("mongodb").WithId<import("mongodb").Document>[]>} */
        const response = {};

        const collections = await database.listCollections({}).toArray();

        for (const collection of collections) {
          const result = await database.collection(collection.name).find({}).toArray();
          response[collection.name] = result;
        }

        res.status(httpStatus.OK).json(response);
      } else res.status(httpStatus.OK).json("OK");
    } catch (error) {
      throw traceError(error, "RouteIndex : getList");
    }
  },
);

// for testing purpose in development environment
router.get(
  "/console",
  /**
   * @param {import('express').Request} _req
   * @param {import('express').Response} res
   */
  (_req, res) => {
    try {
      if (config.env !== "development") return;

      var database = mongodb.getDatabase();
      const collection = "authusers";

      // get the first document matched with query
      const query = { email: new RegExp("[^tk]", "i") };
      database
        .collection(collection)
        .findOne(query)
        .then((doc) => {
          if (doc) {
            console.log("Query result for the email contains tk : ", doc.email);
          } else {
            console.log("There is no email contains tk");
          }
        });

      // get the first document
      database.collection(collection).findOne().then(console.log);

      // get all documents
      var cursor = database.collection(collection).find();
      cursor.toArray().then((docs) => {
        docs.forEach(console.log);
      });

      res.status(httpStatus.OK).json("OK");
    } catch (error) {
      throw traceError(error, "RouteIndex : getConsole");
    }
  },
);

// see the mongodb and redis client status
router.get(
  "/status",
  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async (req, res) => {
    var database = mongodb.getDatabase();

    let mongoStatus, redisStatus, environment, port;

    try {
      environment = process.env.NODE_ENV || config.env;
      port = process.env.PORT || req.headers.host?.split(":")[1];

      redisStatus = redis.getRedisClient().isOpen ? "OK" : "DOWN";

      const result = await database.admin().ping();
      mongoStatus = result.ok === 1 ? "OK" : "DOWN";

      res.json({ environment, port, mongoStatus, redisStatus });
    } catch (error) {
      res.json({ environment, port, mongoStatus: "DOWN", redisStatus });

      //throw traceError(error, "RouteIndex : getStatus");
      console.log(traceError(error, "RouteIndex : getStatus"));
    }
  },
);

// see the mongodb and redis client status
router.get(
  "/test",
  /**
   * @param {import('express').Request<{}, any, any, {error: string}>} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async (req, res, next) => {
    const { error } = req.query;

    // uncaughtException
    if (error === "e") {
      throw new Error("BROKEN"); // express catches syncronous errors
    } else if (error === "x") {
      setTimeout(function () {
        try {
          throw new Error("BROKEN");
        } catch (err) {
          next(err); // express catches errors passed with next function
        }
      }, 100);
    } else if (error === "z") {
      setTimeout(function () {
        throw new Error("BROKEN"); // express does not catch asyncronous errors, the process craches
      }, 100);

      // unhandledRejection
    } else if (error === "r") {
      Promise.reject("Invalid password"); // unhandledRejection event is emitted, the process craches
      res.json("unhandledRejection");
    } else res.json("OK");
  },
);

router.use("/docs", docsRoute);
router.use("/auth", authRoute);
router.use("/authusers", authuserRoute);
router.use("/users", userRoute);
router.use("/joined", joinedRoute);
router.use("/newslatter", newslatterRoute);

module.exports = router;
