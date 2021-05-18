class Token {

	constructor(token, user, expires, type, blacklisted = false, createdAt = Date.now()) {
		this.token = token;
		this.user = user;
		this.expires = expires;
		this.type = type;
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
			doc.blacklisted,
			doc.createdAt,
		)
		tokenDoc.transformId(doc._id);
		return tokenDoc;
	}
}

module.exports = Token;