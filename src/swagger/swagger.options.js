const options = {
	swaggerDefinition: {
		openapi: "3.0.0",
		info: {
			title: "API Documentation",
			version: "1.0.0",
			description: "for github.com/talatkuyuk/nodejs-express-jwt-mongodb-boilerplate",
		},
		license: {
			name: 'MIT',
			url: 'https://github.com/talatkuyuk/nodejs-express-jwt-mongodb-boilerplate/blob/master/LICENSE',
		},
		contact: {
			name: "Talat Kuyuk",
			url: "https://github.com/talatkuyuk/nodejs-express-jwt-mongodb-boilerplate",
			email: "talatkuyuk@gmail.com",
		},
		servers: [
			{
				url: "https://localhost:8443",
			},
		],
	},
	apis: [ `${__dirname}/*.js` ], 
};

module.exports = {
  options
}

