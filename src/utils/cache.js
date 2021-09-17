const redis = require('redis');
const { promisify } = require('util');
const logger = require('..//core/logger')

// Connect to redis at 127.0.0.1 port 6379 no password.
const redisClient = redis.createClient({
    // For the purpose of killing the client when the connection is lost
    retry_strategy: function (options) {
        return undefined;
    }
});

function getRedisClient() { return redisClient; }

redisClient.set = promisify(redisClient.set);
redisClient.setex = promisify(redisClient.setex);
redisClient.get = promisify(redisClient.get);
redisClient.expire = promisify(redisClient.expire);
redisClient.del = promisify(redisClient.del);
redisClient.ttl = promisify(redisClient.ttl);

redisClient.on("error", function(err) {
    logger.error("Bonk. The worker framework cannot connect to redis, which might be ok on a dev server!");
    logger.error("Resque error : "+err);
    client.quit();
});

redisClient.on("idle", function(err) {
    logger.error("Redis queue is idle. Shutting down...");
});

redisClient.on("end", function(err) {
    logger.error("Redis is shutting down. This might be ok if you chose not to run it in your dev environment");
});

redisClient.on("ready", function(err) {
    logger.info("Redis up! Now connecting the worker queue client...");
});

module.exports = {
	redisClient,
	getRedisClient
};