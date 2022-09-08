class User {
  constructor(
    email,
    role,
    name = null,
    gender = null,
    country = null,
    createdAt = Date.now(),
    updatedAt = null
  ) {
    this.email = email;
    this.role = role;
    this.name = name;
    this.gender = gender;
    this.country = country;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  transformId(id) {
    this.id = id.toString();
    delete this._id;
  }

  static fromDoc(doc) {
    if (!doc) return null;
    const user = new User(
      doc.email,
      doc.role,
      doc.name,
      doc.gender,
      doc.country,
      doc.createdAt,
      doc.updatedAt
    );
    doc._id && user.transformId(doc._id);
    doc.deletedAt && (user.deletedAt = doc.deletedAt); // for deletedusers
    return user;
  }

  // eleminates private keys
  filter() {
    const user = Object.assign({}, this);
    const notAllowedKeys = [];
    for (const key of Object.keys(user)) {
      if (notAllowedKeys.includes(key)) delete user[key];
    }
    return user;
  }
}

module.exports = User;
