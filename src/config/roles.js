module.exports.roles = ["user", "admin"];

module.exports.roleRights = {
	"user": [
		"self", 
		"get-user", 
		"update-user",
		"change-password"
	],
	"admin": [
		"query-users", 
		"get-user", 
		"add-user", 
		"update-user", 
		"delete-user", 
		"change-role", 
		"set-ability",
		"change-password"
	]
}