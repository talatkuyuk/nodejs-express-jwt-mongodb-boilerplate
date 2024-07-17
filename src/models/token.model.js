class Token {
  /**
   * @param {string} token
   * @param {string} user
   * @param {Date} expires
   * @param {string} type
   * @param {string} [jti]
   * @param {string} [family]
   * @param {boolean} [blacklisted]
   */
  constructor(token, user, expires, type, jti = "n/a", family = "n/a", blacklisted = false) {
    /** @type {string} */
    this.id;

    /** @type {string} */
    this.token = token;

    /** @type {string} */
    this.user = user;

    /** @type {Date} */
    this.expires = expires;

    /** @type {string} */
    this.type = type;

    /** @type {string} */
    this.jti = jti;

    /** @type {string} */
    this.family = family;

    /** @type {boolean} */
    this.blacklisted = blacklisted;

    /** @type {number} */
    this.createdAt = Date.now();

    /** @type {number|null} */
    this.updatedAt = null;
  }

  /**
   * @param {import("mongodb").WithId<import("mongodb").Document>} doc
   * @returns {Token}
   */
  static fromDoc(doc) {
    const token = new Token(
      doc.token,
      doc.user.toString(), // it is ObjectId in doc
      doc.expires,
      doc.type,
      doc.jti,
      doc.family,
      doc.blacklisted,
    );

    token.id = doc._id.toString();
    token.createdAt = doc.createdAt;

    if (doc.updatedAt) {
      token.updatedAt = doc.updatedAt;
    }

    return token;
  }

  // eleminates private keys, immutable function
  filter() {
    /** @type {Token} */
    const token = Object.assign({}, this);
    /** @type {string[]} */
    const allowedKeys = ["token", "expires"];
    for (const key of Object.keys(token)) {
      if (!allowedKeys.includes(key)) delete token[/** @type {keyof Token} */ (key)];
    }
    return token;
  }
}

module.exports = Token;
