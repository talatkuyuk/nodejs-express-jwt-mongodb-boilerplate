const { roles } = require('../config/roles');

module.exports.authuserSchema = {
	bsonType: "object",
	required: [ "email", "password", "role", "isEmailVerified"],
	properties: {
		email: { bsonType: "string", /* pattern: */ },
		password: { bsonType: "string", /* pattern: */ },
		role: { enum: roles },
		isEmailVerified: { bsonType: "bool" },
		createdAt: { bsonType: "date" },
		updatedAt: { bsonType: "date" },
	}
}