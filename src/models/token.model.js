class Token {

	constructor(token, user, expires, type, family = "n/a", blacklisted = false, createdAt = Date.now()) {
		this.token = token;
		this.user = user;
		this.expires = expires;
		this.type = type;
		this.family = family;
		this.blacklisted = blacklisted;
		this.createdAt = createdAt;
	}

	transformId(id){
		this.id = id;
		delete this._id;
	}

	static fromDoc(doc){
		if (!doc) return null;
		const tokenDoc = new Token(
			doc.token,
			doc.user,
			doc.expires,
			doc.type,
			doc.family,
			doc.blacklisted,
			doc.createdAt,
		)
		tokenDoc.transformId(doc._id);
		return tokenDoc;
	}
}

module.exports = Token;