const { traceError } = require("../utils/errorUtils");

class Utils {
  /**
   * Create an object composed of the picked object properties which is of type string
   * @template {Record<string, unknown>} T
   * @template {keyof T} K
   * @param {T} object - The source object.
   * @param {Array<K>} keys - The array of keys to pick from the source object.
   * @returns {Partial<Pick<{[K in keyof T]: string}, K>>} - The new object with the picked properties.
   */
  static pickStrings(object, keys) {
    try {
      if (!object || !keys) return {};

      /** @type {Partial<Pick<{[K in keyof T]: string}, K>>} */
      const init = {};

      return keys.reduce((obj, key) => {
        if (Object.prototype.hasOwnProperty.call(object, key)) {
          if (typeof object[key] === "string") obj[key] = object[key];
        }
        return obj;
      }, init);
    } catch (error) {
      throw traceError(error, "Util : pick");
    }
  }

  /**
   * Create an object composed of the picked object's boolean properties parsed
   * @template {Record<string, unknown>} T
   * @template {keyof T} K
   * @param {T} object - The source object.
   * @param {Array<K>} keys - The array of keys to pick from the source object.
   * @returns {Partial<Pick<{[K in keyof T]: boolean}, K>>} - The new object with the picked properties.
   */
  static pickBooleans(object, keys) {
    try {
      if (!object || !keys) return {};

      /** @type {Partial<Pick<{[K in keyof T]: boolean}, K>>} */
      const init = {};

      return keys.reduce((obj, key) => {
        switch (typeof object[key]) {
          case "boolean":
            obj[key] = object[key];
            break;
          case "string":
            if (["true", "false"].includes(object[key])) obj[key] = JSON.parse(object[key]);
            break;
        }
        return obj;
      }, init);
    } catch (error) {
      throw traceError(error, "Util : pickBooleans");
    }
  }

  /**
   * Create an object composed of the picked object's number properties parsed
   * @template {Record<string, unknown>} T
   * @template {keyof T} K
   * @param {T} object - The source object.
   * @param {Array<K>} keys - The array of keys to pick from the source object.
   * @returns {Partial<Pick<{[K in keyof T]: number}, K>>} - The new object with the picked properties.
   */
  static pickNumbers(object, keys) {
    try {
      if (!keys || !object) return {};

      /** @type {Partial<Pick<{[K in keyof T]: number}, K>>} */
      const init = {};

      return keys.reduce((obj, key) => {
        switch (typeof object[key]) {
          case "number":
            obj[key] = object[key];
            break;
          case "string":
            if (!isNaN(Number(object[key]))) obj[key] = Number(object[key]);
            break;
        }
        return obj;
      }, init);
    } catch (error) {
      throw traceError(error, "Util : pickNumbers");
    }
  }

  /**
   * Create an object composed of the sort property
   * @param {string|undefined} querySort
   * @param {string[]} sortingFields
   * @returns {Object}
   */
  static pickSort(querySort, sortingFields) {
    try {
      if (!querySort || sortingFields.length === 0) return { createdAt: -1 };

      /** @type {Record<string, number>} */
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
      throw traceError(error, "Util : pickSort");
    }
  }

  /**
   * Split a string into two parts at the first occurance of the seperator
   * @param {string} str
   * @param {string} seperator
   * @returns {[string, string]}
   */
  static splitTwo(str, seperator) {
    try {
      const [first, ...rest] = str.split(seperator);
      const second = rest.join(" ");

      return [first.trim(), second.trim()];
    } catch (error) {
      throw traceError(error, "Util : splitTwo");
    }
  }

  /**
   * Extract the specified key from an object
   * @template {Object} T
   * @template {keyof T} K
   * @param {K} propKey - The source object.
   * @param {T} object - The source object.
   * @returns {Omit<T, K>} The array of keys to pick from the source object.
   */
  static removeKey = (propKey, { [propKey]: propValue, ...rest }) => rest;

  /**
   *
   * @param {number} time
   * @returns {Promise<void>}
   */
  static delay = async (time) => {
    await new Promise((resolve) => {
      setTimeout(resolve, time);
    });
  };
}

module.exports = Utils;
