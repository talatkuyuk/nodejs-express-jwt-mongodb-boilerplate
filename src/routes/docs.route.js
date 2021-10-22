const express = require('express');
const router = express.Router();

const config = require('../config');

const swaggerUi = require('swagger-ui-express'); // to bind swagger with express and show the ui provided by swagger js-doc
const swaggerJsDoc = require("swagger-jsdoc"); // for api documentation

const { options } = require('../swagger/swagger.options'); 
const specs = swaggerJsDoc(options);

var swaggerUiOptions = {
	validatorUrl : null,
	oauth2RedirectUrl: "https://localhost:8443/docs/oauth2-redirect.html",
	oauth: {
		clientId: config.google_client_id,
		clientSecret: config.google_client_secret,
		appName: "todo-app",
		realm: "my-realm",
		additionalQueryStringParams: {test: "hello"},
		usePkceWithAuthorizationCodeGrant: false
    }
};

router.use('/', swaggerUi.serve);
//router.get('/', swaggerUi.setup(specs, { explorer: true })); // without swaggerUiOptions
router.get('/', swaggerUi.setup(specs, true, swaggerUiOptions)); // with swaggerUiOptions

module.exports = router;