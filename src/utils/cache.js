const redis = require('redis');
const { promisify } = require('util');
const logger = require('..//core/logger');

// In order to kill the client when the connection is lost
// const retry_strategy =  (options) => undefined;

const retry_strategy = function(options) {
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
        console.log("cache.js: retry_strategy: End reconnecting with built in error");
        return undefined;
    }
    
    const reconnectAfter = Math.min(options.attempt * 100, 3000);
    // console.log(`cache.js: retry_strategy: Redis reconnection after time: ${reconnectAfter} ms`);
    
    return reconnectAfter;
}


let redisClient = null;

const getRedisClient = () => {
    if (redisClient){
        return redisClient;
    }

    // Connect to redis at 127.0.0.1 port 6379 no password.
    redisClient = redis.createClient({ retry_strategy, connect_timeout: 10 * 60 * 1000 }); // 10 minutes   
    return redisClient;
}

getRedisClient();

redisClient.set = promisify(redisClient.set);
redisClient.setex = promisify(redisClient.setex);
redisClient.get = promisify(redisClient.get);
redisClient.expire = promisify(redisClient.expire);
redisClient.del = promisify(redisClient.del);
redisClient.ttl = promisify(redisClient.ttl);

redisClient.on("error", function(err) {
    logger.error("ON_ERROR The server cannot connect to redis. Error:", err);
    // redisClient.quit();
});

redisClient.on("idle", function(err) {
    logger.error("ON_IDLE Redis queue is idle. Shutting down.");
});

redisClient.on("end", function(err) {
    logger.error("ON_END Redis is shutting down.");
});

redisClient.on("ready", function(err) {
    logger.info("ON_READY Redis up!");
});

redisClient.on("reconnecting", function(err) {
    // logger.info("ON_RECONNECTING Redis is reconnecting...");
});

module.exports = {
	getRedisClient,
};