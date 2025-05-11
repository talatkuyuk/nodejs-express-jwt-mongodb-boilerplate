const redis = require("redis");

const logger = require("../core/logger");
const config = require("../config");

// Connect to redis at 127.0.0.1 port 6379 with no password.
const redisClient = redis.createClient({
  url: config.redis_url,
  socket: {
    connectTimeout: 5 * 1000, // 5 seconds,
    reconnectStrategy: function (retries) {
      if (retries > 8) {
        console.log("Too many attempts to reconnect. Redis connection was terminated");
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

redisClient.on("end", function () {
  logger.warn("ON_END Redis down!");
});

redisClient.on("ready", function () {
  logger.info("ON_READY Redis up!");
});

redisClient.on("reconnecting", function () {
  logger.info("ON_RECONNECTING Redis is reconnecting...");
});

const getRedisClient = () => {
  return redisClient;
};

/**
 *
 * @returns {Promise<void>}
 */
const connect = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    throw error;
  }
};

/**
 * @callback Callback
 */

/**
 * @param {Callback} [callback]
 * @returns {Promise<void>}
 */
const close = async function (callback) {
  try {
    await redisClient.close();
    callback?.();
    // redis.close() creates a thread to close the connection.
    // We wait until all threads have been run once to ensure the connection closes.
    // await new Promise((resolve) => setImmediate(resolve));
  } catch (err) {
    console.log("Error while redis closing client", err);
  }
};

/**
 * @param {Callback} [callback]
 * @returns {Promise<void>}
 */
const destroy = async function (callback) {
  try {
    await redisClient.destroy();
    callback?.();
  } catch (err) {
    console.log("Error while redis destroying client", err);
  }
};

module.exports = {
  connect,
  close,
  destroy,
  getRedisClient,
};
