const { status: httpStatus } = require("http-status");

const config = require("../config");
const logger = require("../core/logger");
const redis = require("../core/redis");
const { traceError } = require("../utils/errorUtils");
const ApiError = require("../utils/ApiError");

// setEx(key, timeout, value); returns "OK" or throw an error if timeout is not number of seconds

/**
 * Put the token into redis cache
 * @param {string} token
 * @param {number} expiresIn
 * @returns {Promise<boolean>}
 */
const put_token_into_blacklist = async (token, expiresIn) => {
  try {
    const redisClient = redis.getRedisClient();

    if (redisClient.isOpen) {
      // some authproviders' tokens have long life up to 60days (see facebook access token)
      var result = await redisClient.setEx(`blacklist_${token}`, expiresIn, "value");

      logger.info(`Redis Service [setEx]: ${result} for tone ${token}`);

      return result === "OK";
    } else {
      logger.warn("Redis Client is down at the moment of a setEx operation");

      if (config.raiseErrorWhenRedisDown)
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          `We've encountered a server internal problem (Redis)`,
        );
      else return false;
    }
  } catch (error) {
    throw traceError(error, "RedisService : put_into_blacklist");
  }
};

/**
 * Put the jti into redis cache
 * @param {string} jti
 * @returns {Promise<boolean>}
 */
const put_jti_into_blacklist = async (jti) => {
  try {
    const redisClient = redis.getRedisClient();

    if (redisClient.isOpen) {
      var result = await redisClient.setEx(
        `blacklist_${jti}`,
        config.jwt.accessExpirationMinutes * 60,
        "value",
      );

      logger.info(`Redis Service [setEx]: ${result} for jti ${jti}`);

      return result === "OK";
    } else {
      logger.warn("Redis Client is down at the moment of a setEx operation");

      if (config.raiseErrorWhenRedisDown)
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          `We've encountered a server internal problem (Redis)`,
        );
      else return false;
    }
  } catch (error) {
    throw traceError(error, "RedisService : put_into_blacklist");
  }
};

/**
 * Check the key and return whether it is in Redis cache or not
 * @param {string} [check]
 * @returns {Promise<boolean>}
 */
const check_in_blacklist = async (check) => {
  if (!check) return false;

  const redisClient = redis.getRedisClient();

  try {
    if (redisClient.isOpen) {
      // get(key); returns value as a string or returns null if the key does not exist
      const result = await redisClient.get(`blacklist_${check}`);

      logger.info(`Redis Service [get]: ${check} is ${result ? "" : "not "}in the blacklist`);

      return result !== null;
    } else {
      logger.warn("Redis Client is down at the moment of a get operation");

      if (config.raiseErrorWhenRedisDown)
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          `We've encountered a server internal problem (Redis)`,
        );
      else return false;
    }
  } catch (error) {
    throw traceError(error, "RedisService : check_in_blacklist");
  }
};

module.exports = { put_token_into_blacklist, put_jti_into_blacklist, check_in_blacklist };
