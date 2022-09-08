module.exports.authService = require("./auth.service");
module.exports.authuserService = require("./authuser.service");
module.exports.userService = require("./user.service");
module.exports.tokenService = require("./token.service");
module.exports.emailService = require("./email.service");
module.exports.joinedService = require("./joined.service");

module.exports.authuserDbService = require("./authuser.db.service");
module.exports.userDbService = require("./user.db.service");
module.exports.tokenDbService = require("./token.db.service");
module.exports.joinedDbService = require("./joined.db.service");

module.exports.authProviders = require("./authProviders");
module.exports.paginaryService = require("./paginary.service");
module.exports.redisService = require("./redis.service");
