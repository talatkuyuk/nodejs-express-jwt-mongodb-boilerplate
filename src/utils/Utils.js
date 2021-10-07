class Utils {

	/**
	 * Create an object composed of the picked object properties
	 * @param {Object} object
	 * @param {string[]} keys
	 * @returns {Object}
	 */
	static pick (object, keys) {
		try {
			if (!keys) return {};
			return keys.reduce((obj, key) => {
				if (object && Object.prototype.hasOwnProperty.call(object, key)) {
					obj[key] = object[key];
				}
				return obj;
			}, {});

		} catch (error) {
			error.description || (error.description = "Utility [pick] failed");
			throw error;
		}
	};

	/**
	 * Create an object composed of the sort property
	 * @param {Object|string} sort
	 * @returns {Object}
	 */
	 static pickSort (querySort) {
		try {
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
			obj["createdAt"] || (obj["createdAt"] = -1);
			
			return obj;

		} catch (error) {
			error.description || (error.description = "Utility [pickSort] failed");
			throw error;
		}
	};

	/**
	 * Parse object keys as boolean: string => boolean
	 * @param {Object} object
	 * @param {string[]} keys
	 * @returns {Object}
	 */
	static parseBooleans (object, keys) {
		try {
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

		} catch (error) {
			error.description || (error.description = "Utility [parseBooleans] failed");
			throw error;
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
			error.description || (error.description = "Utility [splitTwo] failed");
			throw error;
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