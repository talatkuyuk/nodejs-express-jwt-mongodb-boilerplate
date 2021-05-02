module.exports.roles = ["user", "admin"];

module.exports.roleRights = {
	"user": [
		"get-user@self", 
		"update-user@self",
		"change-password@self"
	],
	"admin": [
		"query-users", 
		"get-user", 
		"add-user", 
		"update-user", 
		"delete-user", 
		"change-role", 
		"set-ability",
		"change-password@self"
	]
}