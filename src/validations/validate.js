const { validationResult } = require('express-validator')

const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (errors.isEmpty()) {
    return next()
  }
  
  const extractedErrors = []
  
  errors.array().map(err => {
      // check if a param's error already exists. (for a field, only first error will be pushed)
      let bool = extractedErrors.some(item => item.hasOwnProperty(err.param));
      if (!bool) extractedErrors.push({ [err.param]: err.msg });
  })
  

  return res.status(422).json({
    errors: errors.array(), // { "Errors": [ { value, msg, param, location }, { ... } ]}
    extractedErrors: extractedErrors // { "Errors": [ { param: msg }, { ... } ]}
  })
}

module.exports = validate;