module.exports.authuserSchema = {
  bsonType: "object",
  required: ["email", "password", "isEmailVerified"],
  properties: {
    email: { bsonType: "string" /* pattern: */ },
    password: { bsonType: "string" /* pattern: */ },
    isEmailVerified: { bsonType: "bool" },
    isDisabled: { bsonType: "bool" },
    createdAt: { bsonType: "date" },
    updatedAt: { bsonType: "date" },
  },
};
