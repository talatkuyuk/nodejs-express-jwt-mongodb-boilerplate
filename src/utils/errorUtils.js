const config = require('../config');

// Add desription to Error to locate the module in which occurs
const locateError = (error, description) => {
  if (config.env !== "production") {

      const [main, module] = description.split(" : ");

      // OPTION-1 (error point)
      // error.description || (error.description = description);

      // OPTION-2 (error path)
      if (error.description)
          error.description += `  --->  ${main} [${module}]`
      else
          error.description = `failed in ${main} [${module}]`
  }
  
  return error;
}


module.exports = {
  locateError
};
