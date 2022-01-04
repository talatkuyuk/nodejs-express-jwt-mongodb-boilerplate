const { locateError } = require('../utils/errorUtils');

class Utils {

	/**
	 * Create an object composed of the picked object properties
	 * @param {Object} object
	 * @param {string[]} keys
	 * @returns {Object}
	 */
	static pick (object, keys) {
		try {
			if (!object || !keys) return {};
			return keys.reduce((obj, key) => {
				if (Object.prototype.hasOwnProperty.call(object, key)) {
					if (typeof(object[key]) === "string")
						obj[key] = object[key];
				}
				return obj;
			}, {});

		} catch (error) {
			throw locateError(error, "Util : pick");
		}
	};


	/**
	 * Create an object composed of the picked object's boolean properties parsed
	 * @param {Object} object
	 * @param {string[]} keys
	 * @returns {Object}
	 */
	 static pickBooleans (object, keys) {
		try {
			if (!object || !keys) return {};
			return keys.reduce((obj, key) => {
				switch(typeof(object[key])) {
					case "boolean":
						obj[key] = object[key];
					  	break;
					case "string":
						if (['true', 'false'].includes(object[key]))
							obj[key] =  JSON.parse(object[key]);
					  	break;
				}
				return obj;

			}, {});

		} catch (error) {
			throw locateError(error, "Util : pickBooleans");
		}
	};

	/**
	 * Create an object composed of the picked object's number properties parsed
	 * @param {Object} object
	 * @param {string[]} keys
	 * @returns {Object}
	 */
	static pickNumbers (object, keys) {
		try {
			if (!keys || !object) return {};
			return keys.reduce((obj, key) => {
				switch(typeof(object[key])) {
					case "number":
						obj[key] = object[key];
						break;
					case "string":
						if (!isNaN(object[key]))
							obj[key] =  Number(object[key]);
						break;
				}
				return obj;

			}, {});

		} catch (error) {
			throw locateError(error, "Util : pickNumbers");
		}
	};


	/**
	 * Create an object composed of the sort property
	 * @param {string} sort
	 * @returns {Object}
	 */
	 static pickSort (querySort, sortingFields) {
		try {
			if (querySort == null || sortingFields == null) return { createdAt: -1 };

			const obj = {};
			const parts = querySort.split("|");

			for (const part of parts) {
				const [sort, by] = part.trim().split(".");

				if (sortingFields.includes(sort)) {
					obj[sort] = by?.toLowerCase() === "desc" ? -1 : 1;
				}
			} 

			// add default sorting field for each query
			obj["createdAt"] || (obj["createdAt"] = -1);
			
			return obj;

		} catch (error) {
			throw locateError(error, "Util : pickSort");
		}
	};



	/**
	 * Split a string into two parts at the first occurance of the seperator
	 * @param {string} str
	 * @param {string} seperator
	 * @returns Array[string, string]
	 */
	static splitTwo (str, seperator) {
		try {
			const [first, ...rest] = str.split(seperator);
			const second = rest.join(' ');
			return [first.trim(), second.trim()];

		} catch (error) {
			throw locateError(error, "Util : splitTwo");
		}
	}



	/**
	 * Extract the specified key from an object
	 * @param {string} propKey
	 * @param {Object} 
	 * @returns {Object}
	 */  
	static removeKey = (propKey, { [propKey]: propValue, ...rest }) => rest;
}
  
module.exports = Utils;