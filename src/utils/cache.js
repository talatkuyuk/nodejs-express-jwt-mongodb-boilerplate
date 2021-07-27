const redis = require('redis');
const { promisify } = require('util');

const redisClient = redis.createClient(process.env.REDIS_URI);

redisClient.set = promisify(redisClient.set);
redisClient.setex = promisify(redisClient.setex);
redisClient.get = promisify(redisClient.get);
redisClient.expire = promisify(redisClient.expire);
redisClient.del = promisify(redisClient.del);
redisClient.ttl = promisify(redisClient.ttl);

module.exports = redisClient;