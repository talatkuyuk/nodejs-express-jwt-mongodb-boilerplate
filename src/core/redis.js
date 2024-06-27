const redis = require("redis");

const logger = require("../core/logger");
const config = require("../config");

let redisClient = null;

const connect = async () => {
  return new Promise((resolve, reject) => {
    // let onetimeguard = false;

    // Connect to redis at 127.0.0.1 port 6379 with no password.
    redisClient = redis.createClient({
      url: config.redis_url,
      socket: {
        connectTimeout: 5 * 1000, // 5 seconds,
        reconnectStrategy: function (retries) {
          if (retries > 8) {
            console.log(
              "Too many attempts to reconnect. Redis connection was terminated"
            );
            return new Error("Too many retries.");
          } else {
            return retries * 500;
          }
        },
      },
    });

    redisClient.on("error", function (err) {
      logger.error("ON_ERROR The server cannot connect to redis. Error:", err);
    });

    redisClient.on("end", function (err) {
      logger.warn("ON_END Redis down!");
    });

    redisClient.on("ready", function (err) {
      logger.info("ON_READY Redis up!");
    });

    redisClient.on("reconnecting", function (err) {
      logger.info("ON_RECONNECTING Redis is reconnecting...");
    });

    redisClient
      .connect()
      .then(() => {
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
  });
};

const getRedisClient = () => {
  if (redisClient?.isReady) {
    return redisClient;
  } else {
    logger.warn("redisClient is EMPTY !");
  }
};

const quit = function (callback) {
  if (redisClient?.isReady) {
    return new Promise((resolve, reject) => {
      redisClient.quit((err, res) => {
        if (err) reject(err);

        callback(res);
        resolve();
      });
    });
  }
};

const disconnect = function (callback) {
  if (redisClient?.isReady) {
    return new Promise((resolve, reject) => {
      redisClient.disconnect((err, res) => {
        if (err) reject(err);

        callback(res);
        resolve();
      });
    });
  }
};

module.exports = {
  connect,
  getRedisClient,
  quit,
  disconnect,
};
