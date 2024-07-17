import ApiError from "../src/utils/ApiError";

import "jest-extended";

// interface CustomMatchers<R = string> {
//   toBeMatchedWithError: (expected: ApiError) => R;
// }

// declare global {
//   namespace jest {
//     interface Expect extends CustomMatchers {}
//   }
// }

declare module "expect" {
  interface AsymmetricMatchers {
    toBeMatchedWithError: (expected: ApiError) => void;
  }
  interface Matchers<R> {
    toBeMatchedWithError: (expected: ApiError) => R;
  }
}
