const bcrypt = require("bcryptjs");

class AuthUser {
  /**
   * @typedef {Object} AuthProviders
   * @property {boolean} [emailpassword]
   * @property {string} [google]
   * @property {string} [facebook]
   *
   *
   * @param {string} email
   * @param {string|null} [password]
   * @param {boolean} [isEmailVerified]
   * @param {boolean} [isDisabled]
   * @param {AuthProviders} [providers]
   */
  constructor(email, password = null, isEmailVerified = false, isDisabled = false, providers) {
    /** @type {string} */
    this.id;

    /** @type {string} */
    this.email = email;

    /** @type {string|null} */
    this.password = password;

    /** @type {boolean} */
    this.isEmailVerified = isEmailVerified;

    /** @type {boolean} */
    this.isDisabled = isDisabled;

    /** @type {AuthProviders|undefined} */
    this.providers = providers;

    /** @type {number} */
    this.createdAt = Date.now();

    /** @type {number|null} */
    this.updatedAt = null;

    /** @type {number|undefined} */
    this.deletedAt;
  }

  /**
   * @param {import("mongodb").WithId<import("mongodb").Document>} doc
   * @returns {AuthUser}
   */
  static fromDoc(doc) {
    const authuser = new AuthUser(
      doc.email,
      doc.password,
      doc.isEmailVerified,
      doc.isDisabled,
      doc.providers,
    );

    authuser.id = doc._id.toString();
    authuser.createdAt = doc.createdAt;

    if (doc.updatedAt) {
      authuser.updatedAt = doc.updatedAt;
    }

    if (doc.deletedAt) {
      authuser.deletedAt = doc.deletedAt; // for deleted authusers
    }

    return authuser;
  }

  /**
   *
   * @param {string} password
   * @returns {Promise<Boolean>}
   */
  async isPasswordMatch(password) {
    if (!this.password) return false;
    return await bcrypt.compare(password, this.password);
  }

  // eleminates private keys
  filter() {
    /** @type {AuthUser} */
    const authuser = Object.assign({}, this);
    /** @type {string[]} */
    const notAllowedKeys = ["password"];
    for (const key of Object.keys(authuser)) {
      if (notAllowedKeys.includes(key)) delete authuser[/** @type {keyof AuthUser} */ (key)];
    }
    return authuser;
  }
}

module.exports = AuthUser;
