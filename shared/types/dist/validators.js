"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeEmail = exports.emailValidator = void 0;
const zod_1 = require("zod");
const emailValidator = (email) => {
    const emailCheck = zod_1.z.string().email().safeParse(email);
    return emailCheck.success;
};
exports.emailValidator = emailValidator;
const sanitizeEmail = (email) => {
    return email.toLowerCase().trim();
};
exports.sanitizeEmail = sanitizeEmail;
//# sourceMappingURL=validators.js.map