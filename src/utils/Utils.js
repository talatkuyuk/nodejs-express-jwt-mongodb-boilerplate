class Utils {

	/**
	 * Create an object composed of the picked object properties
	 * @param {Object} object
	 * @param {string[]} keys
	 * @returns {Object}
	 */
	static pick (object, keys) {
		return keys.reduce((obj, key) => {
			if (object && Object.prototype.hasOwnProperty.call(object, key)) {
				obj[key] = object[key];
			}
			return obj;
		}, {});
	};

	/**
	 * Create an object composed of the sort property
	 * @param {Object} object
	 * @returns {Object}
	 */
	 static pickSort (object) {
		return ["sort"].reduce((obj, key) => {
			console.log(typeof(object[key]));

			if (typeof(object[key]) === "object") {
				object[key].map( item => {
					const [sort, by] = item.split(".");
					obj[sort] = by.toLowerCase() === "desc" ? -1 : 1;
				});
			}

			else if (typeof(object[key]) === "string") {
				const [sort, by] = object[key].split(".");
				obj[sort] = by.toLowerCase() === "desc" ? -1 : 1;
			}

			else
				obj = { createdAt: -1};
			
			return obj;
		}, {});
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
				if (['true', 'false', true, false].includes(object[key].toLowerCase()))
					object[key] =  JSON.parse(object[key]);
				else
					delete object[key];
			}
			 
		});
		return object;
	};  
}
  
module.exports = Utils;