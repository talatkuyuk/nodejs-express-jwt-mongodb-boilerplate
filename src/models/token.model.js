class Token {

	constructor(token, user, expires, type, jti = "n/a", family = "n/a", blacklisted = false, createdAt = Date.now()) {
		this.token = token;
		this.user = user;
		this.expires = expires;
		this.type = type;
		this.jti = jti;
		this.family = family;
		this.blacklisted = blacklisted;
		this.createdAt = createdAt;
	}

	transformId(id){
		this.id = id.toString();
		delete this._id;
	}

	static fromDoc(doc){
		if (!doc) return null;
		const tokenDoc = new Token(
			doc.token,
			doc.user.toString(),
			doc.expires,
			doc.type,
			doc.jti,
			doc.family,
			doc.blacklisted,
			doc.createdAt,
		)
		tokenDoc.transformId(doc._id);
		return tokenDoc;
	}

	// eleminates private keys
	filter() {
		const token = Object.assign({}, this);
		const notAllowedKeys = ["id", "user", "type", "jti", "family", "blacklisted", "createdAt"];
		for (const key of Object.keys(token)) {
			if (notAllowedKeys.includes(key)) delete token[key];
		}
		return token;
	}
}

module.exports = Token;