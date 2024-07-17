import { oneOfNameGenderCountry, updateUser } from "../src/validations/user.ValidationRules";

declare module "express-xss-sanitizer";

type Prettify<T> = { [K in keyof T]: T[K] } & {};

type X = typeof oneOfNameGenderCountry;
type Y = Prettify<X>;

type A = typeof updateUser;
type B = Prettify<A>;
