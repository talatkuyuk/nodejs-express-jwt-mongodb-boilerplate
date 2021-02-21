const validate = require('./validate');
const authValidationRules = require('./authValidationRules');

module.exports = { validate, ...authValidationRules };