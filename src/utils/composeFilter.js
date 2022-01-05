const { traceError } = require('./errorUtils');
const Utils = require('./Utils');


const composeFilter = (query, fields) => {
	try {
		let stringFilters = {}, booleanFilters = {}, numberFilters = {};

		if (fields.stringFields) {
			stringFilters = Utils.pick(query, fields.stringFields);
		}
		
		if (fields.booleanFields) {
			booleanFilters = Utils.pickBooleans(query, fields.booleanFields);
		}

		if (fields.numberFields) {
			numberFilters = Utils.pickNumbers(query, fields.booleanFields);
		}

		return {...stringFilters, ...booleanFilters, ...numberFilters};

	} catch (error) {
		throw traceError(error, "Utils : composeFilter");
	}
}


module.exports = composeFilter;