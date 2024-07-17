// /** @typedef {import('./ApiError')} ApiError */

const config = require("../config");
const ApiError = require("./ApiError");

//
/**
 * Add desription to Error to locate the module in which occurs
 *
 * @param {unknown} error
 * @param {string} mainmodule
 * @returns {Error | unknown}
 */
const traceError = (error, mainmodule) => {
  if (config.env === "production") return error;

  if (error instanceof ApiError) {
    // OPTION-1 (error point)
    // error.errorPath || (error.errorPath = `${main} [${module}]`);

    // OPTION-2 (error path)
    const [main, module] = mainmodule.split(" : ");

    if (error.errorPath) error.errorPath += `  --->  ${main} [${module}]`;
    else error.errorPath = `failed in ${main} [${module}]`;
  }

  return error;
};

/**
 *
 * @param {Error} error
 * @returns
 */
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
