/**
 * A CustomMatcher function
 * @param {string} received
 * @param {string[]} expected
 * @returns {jest.CustomMatcherResult}
 */
function toBeOneOf(received, expected) {
  const validValues = Array.isArray(expected) ? expected : [expected];
  const pass = validValues.includes(received);
  if (pass) {
    return {
      message: () => `expected ${received} not to be one of [${validValues.join(", ")}]`,
      pass: true,
    };
  }
  return {
    message: () => `expected ${received} to be one of [${validValues.join(", ")}]`,
    pass: false,
  };
}

module.exports = toBeOneOf;
