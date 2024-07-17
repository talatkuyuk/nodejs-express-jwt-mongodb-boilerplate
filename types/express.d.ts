// import _User from "../src/models/user.model";
// import _AuthUser from "../src/models/authuser.model";

declare namespace Express {
  interface Request {
    // [key: string]: any;
    user?: {
      id: string;
      email: string;
      role: "user" | "admin";
    };
    authuser: {
      id: string;
      email: string;
      isEmailVerified: boolean;
      isDisabled: boolean;
      providers?: {
        emailpassword?: boolean;
        google?: string;
        facebook?: string;
      };
    };
    oAuth: {
      provider: "emailpassword" | "google" | "facebook";
      token: string;
      expiresIn: number;
      identity: {
        id: string;
        email: string;
      };
    };
    accesstoken: string;
    jti: string;
  }
}
