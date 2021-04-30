class Token {

	constructor(token, user, expires, type, blacklisted = false, createdAt = Date.now()) {
		this.token = token;
		this.user = user;
		this.expires = expires;
		this.type = type;
		this.blacklisted = blacklisted;
		this.createdAt = createdAt;
	}
}

module.exports = Token;