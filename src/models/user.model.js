const bcrypt = require('bcryptjs');

class User {

	constructor(email, role, name = null, gender = null, country = null, createdAt = Date.now()) {
		this.email = email;
		this.role = role;
		this.name = name;
		this.gender = gender;
		this.country = country;
		this.createdAt = createdAt;
	}

	transformId(id){
		this.id = id;
		delete this._id;
	}

	static fromDoc(doc){
		if (!doc) return null;
		const user = new User(
			doc.email,
			doc.role,
			doc.name,
			doc.gender,
			doc.country,
			doc.createdAt,
		)
		user.transformId(doc._id);
		return user;
	}

	// eleminates private keys
	userfilter() {
		const user = Object.assign({}, this);
		const notAllowedKeys = ["updatedAt"];
		for (const key of Object.keys(user)) {
			if (notAllowedKeys.includes(key)) delete user[key];
		}
		return user;
	}
}

module.exports = User;