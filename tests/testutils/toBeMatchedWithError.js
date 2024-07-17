const { serializeError } = require("serialize-error");

const ApiError = require("../../src/utils/ApiError");

/**
 * A CustomMatcher function
 * @param {ApiError} received
 * @param {ApiError} expected
 * @returns {jest.CustomMatcherResult}
 */
function toBeMatchedWithError(received, expected) {
  // if the received error is not ApiError, convert it, since I set the expected to be ApiError for simplicity
  if (!(received instanceof ApiError)) received = new ApiError(expected.statusCode, received);

  // Error objects have un-enumarated keys, so need to use serialize-error package.
  const sReceived = serializeError(received);
  const sExpected = serializeError(expected);

  const { name: rName, message: rMessage, statusCode: rCode } = sReceived;
  const { name: eName, message: eMessage, statusCode: eCode } = sExpected;

  // const check = (r, e) => r === e;
  /**
   * @param {unknown} r
   * @param {unknown} e
   * @returns {boolean}
   */
  const check = (r, e) => {
    r !== e && console.log(`Expected: ${e}\nReceived: ${r}`);
    return r === e;
  };

  const passName = check(rName, eName);
  const passMessage = check(rMessage, eMessage);
  const passCode = check(rCode, eCode);

  const pass = passName && passMessage && passCode;
  // const message = pass ? () => 'Error matched' : () => 'Error is not matched'

  return { pass, message: () => (pass ? "passed" : "didn't passed") };
}

module.exports = toBeMatchedWithError;
