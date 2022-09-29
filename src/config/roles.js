module.exports.roles = ["user", "admin"];

module.exports.roleRights = {
  user: [
    //user related
    "get-user@self",
    "add-user@self",
    "update-user@self",
    "delete-user@self",
    //authuser related
    "get-authuser@self",
    "change-password@self",
  ],
  admin: [
    //user related
    "query-users",
    "get-user",
    "add-user",
    "update-user",
    "delete-user",
    "change-role",
    //authuser related
    "query-authusers",
    "get-authuser",
    "add-authuser",
    "toggle-ability-authuser",
    "toggle-verification-authuser",
    "delete-authuser",
    //joined related
    "query-users-joined",
    "query-authusers-joined",
    //self related
    "change-password@self",
  ],
};
