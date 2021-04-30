const bcrypt = require('bcryptjs');

class User {

	constructor(email, password, role = "user", isEmailVerified = false, disabled = false, createdAt = Date.now()) {
		this.email = email;
		this.password = password;
		this.role = role;
		this.isEmailVerified = isEmailVerified;
		this.disabled = disabled;
		this.createdAt = createdAt;
	}

	transformId(id){
		this.id = id;
		delete this._id;
	}

	async isPasswordMatch(password) {
		return await bcrypt.compare(password, this.password);
	};

	static fromDoc(doc){
		if (!doc) return null;
		const user = new User(
			doc.email,
			doc.password,
			doc.role,
			doc.isEmailVerified,
			doc.disabled,
			doc.createdAt,
		)
		user.transformId(doc._id);
		return user;
	}

	// update instance with profile attributes: name, gender, country
	extendWith(doc) {
		const excludedKeys = ["_id", "email"];
		for (const key of Object.keys(doc)) {
			if (!excludedKeys.includes(key)) this[key] = doc[key];
		}
	}

	// eleminates private keys like password
	filter() {
		const user = Object.assign({}, this);
		delete user.password;
		delete user.updatedAt;
		return user;
	}

}

module.exports = User;