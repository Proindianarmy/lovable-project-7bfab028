import { validationResult } from "express-validator";
import { error } from "../utils/response.js";

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    return error(res, messages[0], 400, messages);
  }
  next();
};
