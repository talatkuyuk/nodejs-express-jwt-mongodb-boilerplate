const Utils = require('../utils/Utils');
const { locateError } = require('../utils/ApiError');

const paginary = async (query, filter, dbQueryCallback) => {

	try {
		const { page, sort, skip, limit } = composePaginary(query);
	
		// query from db
		const result = await dbQueryCallback(filter, sort, skip, limit);

		// main content from result = [{ users: [objects], total: [{ count: n }] }]
		const content = result[0];

		return prepareResponse(content, page, limit);
		
	} catch (error) {
		throw locateError(error, "PaginaryService : paginary");
	}
}


const paginaryForJoinQuery = async (query, filterLeft, filterRight, dbQueryCallback) => {

	try {
		const { page, sort, skip, limit } = composePaginary(query);
	
		// query from db
		const result = await dbQueryCallback(filterLeft, filterRight, sort, skip, limit);

		// main content from result = [{ users: [objects], total: [{ count: n }] }]
		const content = result[0];

		return prepareResponse(content, page, limit);
		
	} catch (error) {
		throw locateError(error, "PaginaryService : paginaryForJoinQuery");
	}
}


const prepareResponse = (content, page, limit) => {
	
	const isEmpty = content["total"].length === 0; // means that no any records
	const totalCount = isEmpty ? 0 : content["total"][0]["count"]
	delete content["total"];

	content["totalCount"] = totalCount;
	content["pagination"] = {
		currentPage: page,
		totalPages: Math.ceil(totalCount / limit),
		perPage: limit
	};
	
	return content;
}


const composePaginary = (query) => {
	const DEFAULT_PAGE_SIZE = 20;
	const DEFAULT_PAGE = 1;
	
	const page = parseInt(query.page) || DEFAULT_PAGE;
	
	const sort = Utils.pickSort(query.sort);

	const limit = parseInt(query.size) || DEFAULT_PAGE_SIZE;
	const skip = (page - 1) * limit;

	return { page, sort, skip, limit };
}


module.exports = {
	paginary,
	paginaryForJoinQuery
};