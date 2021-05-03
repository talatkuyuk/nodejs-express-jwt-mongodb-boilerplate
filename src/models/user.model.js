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

	// allows specific keys for success auth result
	authfilter(){
		const user = {};
		const allowedKeys = ["id", "email", "isEmailVerified"];
		for (const key of Object.keys(this)) {
			if (allowedKeys.includes(key)) user[key] = this[key];
		}
		user["isAuthorized"] = true;
		return user;
	}

	// eleminates private keys like password
	userfilter() {
		const user = Object.assign({}, this);
		const notAllowedKeys = ["password", "updatedAt"];
		for (const key of Object.keys(user)) {
			if (notAllowedKeys.includes(key)) delete user[key];
		}
		return user;
	}
}

module.exports = User;