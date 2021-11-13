module.exports.roles = ["user", "admin"];

module.exports.roleRights = {
	"user": [
		//user related
		"get-user@self", 
		"add-user@self",
		"update-user@self",
		"delete-user@self",
		//authuser related
		"get-authuser@self",
		"change-password@self"
	],
	"admin": [
		//user related
		"get-user", 
		"add-user", 
		"update-user",
		"delete-user", 
		"query-users",
		"query-users-joined",
		"change-role", 
		//authuser related
		"add-authuser",
		"get-authuser",
		"query-authusers",
		"query-authusers-joined",
		"toggle-authuser",
		"delete-authuser",
		//self related
		"change-password@self"
	]
}