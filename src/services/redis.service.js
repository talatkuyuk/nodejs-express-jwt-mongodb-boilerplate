const httpStatus = require('http-status');

const config = require('../config');
const logger = require('../core/logger');
const { getRedisClient } = require('../core/redis');
const { ApiError, locateError } = require('../utils/ApiError');


/**
 * Put the key into Redis cache
 * @param {string} box // "jti" | "token"
 * @param {string|Object} put
 * @returns {Promise<boolean>}
 */
const put_into_blacklist = async (box, put)  => {
	try {
		const redisClient = getRedisClient();

		if (redisClient) {

			// setex(key, timeout, value); returns "OK" or throw an error if timeout is not number of seconds

			if (box === "jti") {
				var result = await redisClient.setex(`blacklist_${put}`, config.jwt.accessExpirationMinutes * 60, "value");
			}

			if (box === "token") {
				// some authproviders' tokens have long life up to 60days (see facebook access token)
				var result = await redisClient.setex(`blacklist_${put.token}`, put.expiresIn, "value");
			}

			logger.info(`Redis Service [setex]: ${result} for ${box} ${put}`);

			return result === "OK";

		} else {
			logger.warn("Redis Client is down at the moment of a setex operation");
			
			if (config.raiseErrorWhenRedisDown)
				throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `We've encountered a server internal problem (Redis)`);
			else
				return false;
		}

	} catch (error) {
		throw locateError(error, "RedisService : put_into_blacklist");
	}
}



/**
 * Check the key and return whether it is in Redis cache or not
 * @param {string} check
 * @returns {Promise<boolean>}
 */
const check_in_blacklist = async (check)  => {
	try {
		const redisClient = getRedisClient();

		if (redisClient) {
			// get(key); returns value as a string or returns null if the key does not exist
			const result = await redisClient.get(`blacklist_${check}`);

			logger.info(`Redis Service [get]: ${check} is ${result?"":"not "}in the blacklist`);

			return result !== null;

		} else {
			logger.warn("Redis Client is down at the moment of a get operation");
			
			if (config.raiseErrorWhenRedisDown)
				throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `We've encountered a server internal problem (Redis)`);
			else
				return false;
		}

	} catch (error) {
		throw locateError(error, "RedisService : check_in_blacklist");
	}
}


module.exports = {
	put_into_blacklist,
	check_in_blacklist,
}
