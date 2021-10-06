class Utils {

	/**
	 * Create an object composed of the picked object properties
	 * @param {Object} object
	 * @param {string[]} keys
	 * @returns {Object}
	 */
	static pick (object, keys) {
		if (!keys) return {};
		return keys.reduce((obj, key) => {
			if (object && Object.prototype.hasOwnProperty.call(object, key)) {
				obj[key] = object[key];
			}
			return obj;
		}, {});
	};

	/**
	 * Create an object composed of the sort property
	 * @param {Object|string} sort
	 * @returns {Object}
	 */
	 static pickSort (querySort) {
		
		const obj = {};

		// if it is array
		if (typeof(querySort) === "object") {
			querySort.map( item => {
				const [sort, by] = item.split(".");
				obj[sort] = by?.toLowerCase() === "desc" ? -1 : 1;
			});
		}

		// if it is string
		else if (typeof(querySort) === "string") {
			const [sort, by] = querySort.split(".");
			obj[sort] = by?.toLowerCase() === "desc" ? -1 : 1;
		}

		// add default sorting field
		obj["createdAt"] = -1 ;
		
		return obj;
	};

	/**
	 * Parse object keys as boolean: string => boolean
	 * @param {Object} object
	 * @param {string[]} keys
	 * @returns {Object}
	 */
	static parseBooleans (object, keys) {
		keys.forEach( key => {
			if (object.hasOwnProperty(key)) {
				if (typeof object[key] === "string")
					object[key] = object[key].toLowerCase();

				if (['true', 'false', true, false].includes(object[key]))
					object[key] =  JSON.parse(object[key]);
				else
					delete object[key];
			}
			 
		});
		return object;
	};

	/**
	 * Split a string into two parts at the first occurance of the seperator
	 * @param {string} str
	 * @param {string} seperator
	 * @returns Array[string, string]
	 */
	static splitTwo (str, seperator) {
		const [first, ...rest] = str.split(seperator);
		const second = rest.join(' ');
		return [first.trim(), second.trim()];
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