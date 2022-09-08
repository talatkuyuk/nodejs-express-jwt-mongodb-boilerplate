const config = require("../config");

// Add desription to Error to locate the module in which occurs
const traceError = (error, mainmodule) => {
  if (config.env !== "production") {
    const [main, module] = mainmodule.split(" : ");

    // OPTION-1 (error point)
    // error.errorPath || (error.errorPath = `${main} [${module}]`);

    // OPTION-2 (error path)
    if (error.errorPath) error.errorPath += `  --->  ${main} [${module}]`;
    else error.errorPath = `failed in ${main} [${module}]`;
  }
  return error;
};

function isOperationalError(error) {
  if (error instanceof ApiError) {
    return error.isOperational;
  }
  return false;
}

module.exports = {
  traceError,
  isOperationalError,
};
