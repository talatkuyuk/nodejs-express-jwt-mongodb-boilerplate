const { tokenTypes } = require('../config/tokens');

module.exports.tokenSchema = {
	bsonType: "object",
	required: [ "token", "user", "type", "expires" ],
	properties: {
		token: { bsonType: "string" },
		user: { bsonType: "objectId" },
		expires: { bsonType: "date" },
		type: { enum: [tokenTypes.REFRESH, tokenTypes.RESET_PASSWORD, tokenTypes.VERIFY_EMAIL] },
		blacklisted: { bsonType: "bool" },
		createdAt: { bsonType: "date" },
	}
}