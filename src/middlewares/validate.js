const { validationResult } = require('express-validator')

const validate = (rulesSchema) => async (req, res, next) => {

  await Promise.all(rulesSchema.map((rulesSchema) => rulesSchema.run(req)));

  const errors = validationResult(req)
  if (errors.isEmpty()) {
    return next();
  }
  
  const extractedErrors = [];
  const extactedErrorObject = {};
  
  errors.array().map(err => {
      // check if a param's error already exists. (only first error will be pushed for a spesific param)
      let bool = extractedErrors.some(item => item.hasOwnProperty(err.param));
      if (!bool) {
        extractedErrors.push({ [err.param]: err.msg });
        extactedErrorObject[err.param] = err.msg;
      } 
  })
  

  return res.status(422).json({
    errors: errors.array(), // { "Errors": [ { value, msg, param, location }, { ... } ]}
    extractedErrors, // { "Errors": [ { param: msg }, { ... } ]}
    extactedErrorObject, // { param: msg, ... }
  })
}

module.exports = validate;