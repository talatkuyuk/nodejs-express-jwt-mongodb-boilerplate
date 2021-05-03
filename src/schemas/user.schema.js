const { roles } = require('../config/roles');

module.exports.userSchema = {
	bsonType: "object",
	required: [ "email" ],
	properties: {
		email: { bsonType: "string", /* pattern: */ },
		name: { bsonType: "string", /* min: */ },
		role: { enum: roles },
		gender: { enum: ["male", "female", "none"] },
		country: { bsonType: "string", /* only capital max, min: */ },
		updatedAt: { bsonType: "date" },
	}
}