module.exports.userSchema = {
	bsonType: "object",
	required: [ "email" ],
	properties: {
		email: { bsonType: "string", /* pattern: */ },
		name: { bsonType: "string", /* min: */ },
		gender: { enum: ["male", "female", "none"] },
		country: { bsonType: "string", /* only capital max, min: */ },
		updatedAt: { bsonType: "date" },
	}
}