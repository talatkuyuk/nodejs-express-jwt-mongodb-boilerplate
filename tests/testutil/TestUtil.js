const {serializeError} = require('serialize-error');
const ApiError = require('../../src/utils/ApiError');

class TestUtil {
	static MatchErrors = () => expect.extend({
		toBeMatchedWithError(received, expected) {

			// if the received error is not ApiError, convert it, since I set the expected to be ApiError for simplicity
			if (!(received instanceof ApiError))
				received = new ApiError(expected.statusCode, received);
		
			// Error objects have un-enumarated keys, so need to use serialize-error package.
			const sReceived = serializeError(received)
			const sExpected = serializeError(expected)

			const { name: rName, message: rMessage, statusCode: rCode } = sReceived;
			const { name: eName, message: eMessage, statusCode: eCode } = sExpected;

			const check = (r, e) => r === e || console.log(`Expected: ${e}\nReceived: ${r}`);

			const passName = check(rName, eName);
			const passMessage = check(rMessage, eMessage);
			const passCode = check(rCode, eCode);
			
			return { pass: passName && passMessage && passCode };
		},
	});
}

module.exports =  TestUtil;