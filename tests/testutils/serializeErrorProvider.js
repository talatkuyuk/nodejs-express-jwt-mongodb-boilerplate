/**
 * @typedef {typeof import("serialize-error").serializeError} SerializeError
 * @typedef {typeof import("serialize-error").serializeError | null} SerializeErrorOrNull
 */

/** @type {SerializeErrorOrNull} */
let _serializeError = null;

/**
 * @param {SerializeError} fn
 */
function setSerializeError(fn) {
  _serializeError = fn;
}

/**
 * @returns {SerializeError}
 */
function getSerializeError() {
  if (!_serializeError) {
    throw new Error("serializeError not initialized!");
  }

  return _serializeError;
}

async function initSerializeError() {
  const { serializeError } = await import("serialize-error");
  setSerializeError(serializeError);
}

module.exports = {
  initSerializeError,
  getSerializeError,
};
