const bcrypt = require('bcryptjs');

class AuthUser {

	constructor (
		email, 
		password, 
		isEmailVerified = false, 
		isDisabled = false, 
		createdAt = Date.now(), 
		services
		) {
		this.email = email;
		this.password = password;
		this.isEmailVerified = isEmailVerified;
		this.isDisabled = isDisabled;
		this.createdAt = createdAt;
		this.services = services;
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
			doc.isDisabled,
			doc.createdAt,
			doc.services
		)
		authuser.transformId(doc._id);
		return authuser;
	}

	async isPasswordMatch(password) {
		if (!this.password) return false;
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
		const notAllowedKeys = ["password", "isDisabled"];
		for (const key of Object.keys(authuser)) {
			if (notAllowedKeys.includes(key)) delete authuser[key];
		}
		return authuser;
	}

	// eleminates private password
	passwordfilter(){
		const authuser = Object.assign({}, this);
		const notAllowedKeys = ["password"];
		for (const key of Object.keys(authuser)) {
			if (notAllowedKeys.includes(key)) delete authuser[key];
		}
		return authuser;
	}

}

module.exports = AuthUser;