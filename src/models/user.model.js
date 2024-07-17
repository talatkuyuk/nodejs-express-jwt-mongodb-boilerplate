class User {
  /**
   * @param {string} email
   * @param {"user"|"admin"} role
   * @param {string} [name]
   * @param {string} [gender]
   * @param {string} [country]
   */
  constructor(email, role, name, gender, country) {
    /** @type {string} */
    this.id;

    /** @type {string} */
    this.email = email;

    /** @type {"user"|"admin"} */
    this.role = role;

    /** @type {string|undefined} */
    this.name = name;

    /** @type {string|undefined} */
    this.gender = gender;

    /** @type {string|undefined} */
    this.country = country;

    /** @type {number} */
    this.createdAt = Date.now();

    /** @type {number|null} */
    this.updatedAt = null;

    /** @type {number|undefined} */
    this.deletedAt;
  }

  /**
   * @param {import("mongodb").WithId<import("mongodb").Document>} doc
   * @returns {User}
   */
  static fromDoc(doc) {
    const user = new User(doc.email, doc.role, doc.name, doc.gender, doc.country);

    user.id = doc._id.toString();
    user.createdAt = doc.createdAt;

    if (doc.updatedAt) {
      user.updatedAt = doc.updatedAt;
    }

    if (doc.deletedAt) {
      user.deletedAt = doc.deletedAt; // for deleted users
    }
    return user;
  }

  // eleminates private keys
  filter() {
    /** @type {User} */
    const user = Object.assign({}, this);
    /** @type {string[]} */
    const notAllowedKeys = [];
    for (const key of Object.keys(user)) {
      if (notAllowedKeys.includes(key)) delete user[/** @type {keyof User} */ (key)];
    }
    return user;
  }
}

module.exports = User;
