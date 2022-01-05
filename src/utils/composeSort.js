const { traceError } = require('./errorUtils');
const Utils = require('./Utils');


const composeSort = (query, sortingFields) => {
	try {
		return Utils.pickSort(query.sort, sortingFields);

	} catch (error) {
		throw traceError(error, "Utils : composeSort");
	}
}


module.exports = composeSort;