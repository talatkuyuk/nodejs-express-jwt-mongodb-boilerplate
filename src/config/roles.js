module.exports.roles = ["user", "admin"];

module.exports.roleRights = {
	"user": ["self", "get-user", "update-user"],
	"admin": ["query-users", "get-user", "add-user", "update-user", "delete-user"]
}