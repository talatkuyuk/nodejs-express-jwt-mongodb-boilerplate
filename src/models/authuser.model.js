const bcrypt = require('bcryptjs');

class AuthUser {

	constructor(email, password, isEmailVerified = false, disabled = false, createdAt = Date.now()) {
		this.email = email;
		this.password = password;
		this.isEmailVerified = isEmailVerified;
		this.disabled = disabled;
		this.createdAt = createdAt;
	}

	transformId(id){
		this.id = id;
		delete this._id;
	}

	static fromDoc(doc){
		if (!doc) return null;
		const authuser = new AuthUser(
			doc.email,
			doc.password,
			doc.isEmailVerified,
			doc.disabled,
			doc.createdAt,
		)
		authuser.transformId(doc._id);
		return authuser;
	}

	async isPasswordMatch(password) {
		return await bcrypt.compare(password, this.password);
	};

	// update instance with profile attributes: name, gender, country
	extendWith(doc) {
		const excludedKeys = ["_id", "email"];
		for (const key of Object.keys(doc)) {
			if (!excludedKeys.includes(key)) this[key] = doc[key];
		}
	}

	// eleminates private keys
	authfilter(){
		const authuser = Object.assign({}, this);
		const notAllowedKeys = ["password", "disabled"];
		for (const key of Object.keys(authuser)) {
			if (notAllowedKeys.includes(key)) delete authuser[key];
		}
		return authuser;
	}

}

module.exports = AuthUser;