const redis = require("redis");
const redisUrlParse = require("redis-url-parse");
const { promisify } = require("util");
const logger = require("../core/logger");
const config = require("../config");

// In order to kill the client when the connection is lost
// const retry_strategy =  (options) => undefined;

const retry_strategy = function (options) {
  // console.log("cache.js: retry_strategy: started");
  if (options.error?.code === "ECONNREFUSED") {
    // do not return any Error to continue retry_strategy !
    // console.log("cache.js: retry_strategy: The server refused the connection");
  }
  if (options.total_retry_time > options.connect_timeout) {
    // End reconnecting after a specific timeout
    // console.log("cache.js: retry_strategy: Retry time exhausted");
    return new Error("Redis total retry time exhausted");
  }
  if (options.attempt > 200) {
    // End reconnecting with built in error
    console.log(
      "cache.js: retry_strategy: End reconnecting with built in error"
    );
    return undefined;
  }

  const reconnectAfter = Math.min(options.attempt * 100, 3000);
  // console.log(`cache.js: retry_strategy: Redis reconnection after time: ${reconnectAfter} ms`);

  return reconnectAfter;
};

// compose redis connection parameters from the redis url in config
const redis_connection_parameters = redisUrlParse(config.redis_url);
if (!redis_connection_parameters?.password)
  delete redis_connection_parameters?.password;

let redisClient = null;

const connect = async () => {
  return new Promise((resolve, reject) => {
    let onetimeguard = false;

    // Connect to redis at 127.0.0.1 port 6379 with no password.
    redisClient = redis.createClient({
      ...redis_connection_parameters,
      retry_strategy,
      connect_timeout: 10 * 60 * 1000, // 10 minutes
      enable_offline_queue: false,
    });

    redisClient.set = promisify(redisClient.set);
    redisClient.setex = promisify(redisClient.setex);
    redisClient.get = promisify(redisClient.get);
    redisClient.expire = promisify(redisClient.expire);
    redisClient.del = promisify(redisClient.del);
    redisClient.ttl = promisify(redisClient.ttl);

    redisClient.on("error", function (err) {
      logger.error("ON_ERROR The server cannot connect to redis. Error:", err);

      if (!onetimeguard) {
        reject("Timeout happened with error in Redis");
        onetimeguard = true;
      }
    });

    redisClient.on("idle", function (err) {
      logger.error("ON_IDLE Redis queue is idle. Shutting down.");
    });

    redisClient.on("end", function (err) {
      logger.warn("ON_END Redis down!");

      if (!onetimeguard) {
        reject("Timeout happened with end in Redis");
        onetimeguard = true;
      }
    });

    redisClient.on("ready", function (err) {
      logger.info("ON_READY Redis up!");

      if (!onetimeguard) {
        resolve();
        onetimeguard = true;
      }
    });

    redisClient.on("reconnecting", function (err) {
      // logger.info("ON_RECONNECTING Redis is reconnecting...");
    });
  });
};

const getRedisClient = () => {
  if (redisClient?.connected) {
    return redisClient;
  }
};

const disconnect = function (callback) {
  if (redisClient?.connected) {
    return new Promise((resolve, reject) => {
      redisClient.quit((err, res) => {
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
  disconnect,
};
