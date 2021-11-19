const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
	openapi: "3.0.2",
	info: {
		title: "Safemeals API Documentation",
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
			url: "https://authouse.herokuapp.com",
			description: 'The server on Heroku',
		},
		{
			url: "https://localhost:8443",
			description: 'Secure server for development',
		},
		{
			url: "http://localhost:3000",
			description: 'Non-Secure server for development',
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
		{
			name: "Users",
			description: 'Manuplates the Users',
		},
		{
			name: "Joined",
			description: 'Queries on join AuthUsers & Users',
		},
	]
};

const options = {
	swaggerDefinition,
	apis: [ 
		`${__dirname}/*.yaml`, 
		//`${__dirname}/*.js` 
	], 
};

// export validated swagger spesification in json format
const swaggerSpec = swaggerJSDoc(options);

module.exports = {
	swaggerSpec
}