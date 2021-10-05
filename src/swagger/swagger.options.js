const options = {
	swaggerDefinition: {
		openapi: "3.0.2",
		info: {
			title: "API Documentation",
			description: "for github.com/talatkuyuk/nodejs-express-jwt-mongodb-boilerplate",
			contact: {
				name: "Talat Kuyuk",
				url: "https://github.com/talatkuyuk/nodejs-express-jwt-mongodb-boilerplate",
				email: "talatkuyuk@gmail.com",
			},
			license: {
				name: 'MIT',
				url: 'https://github.com/talatkuyuk/nodejs-express-jwt-mongodb-boilerplate/blob/master/LICENSE',
			},
			version: "1.0.0",
		},
		servers: [
			{
				url: "https://localhost:8443",
				description: 'Secure development server',
			},
			{
				url: "http://localhost:3000",
				description: 'Non-Secure development server',
			},
		],
		tags: [
			{
				name: "Auth",
				description: 'Authentication',
			},
			{
				name: "AuthUsers",
				description: 'Manuplates the AuthUsers',
			},
		]
	},
	apis: [ `${__dirname}/*.yaml`, `${__dirname}/*.js` ], 
};

module.exports = {
  options
}

