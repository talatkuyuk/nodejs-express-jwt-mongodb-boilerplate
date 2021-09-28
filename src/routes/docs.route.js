const express = require('express');
const router = express.Router();

const swaggerUi = require('swagger-ui-express'); // to bind swagger with express and show the ui provided by swagger js-doc
const swaggerJsDoc = require("swagger-jsdoc"); // for api documentation

const { options } = require('../swagger/swagger.options'); 
const specs = swaggerJsDoc(options);

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(specs, { explorer: true }));

module.exports = router;