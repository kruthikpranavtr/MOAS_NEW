import { Request, Response, NextFunction } from "express";

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: "string" | "number" | "boolean" | "array" | "object";
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: string[];
}

export function validateBody(rules: (string | ValidationRule)[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const body = req.body || {};
    const errors: string[] = [];

    for (const item of rules) {
      const rule: ValidationRule = typeof item === "string" ? { field: item, required: true } : item;
      const val = body[rule.field];

      if (rule.required && (val === undefined || val === null || val === "")) {
        errors.push(`Field '${rule.field}' is required.`);
        continue;
      }

      if (val !== undefined && val !== null) {
        if (rule.type) {
          if (rule.type === "array" && !Array.isArray(val)) {
            errors.push(`Field '${rule.field}' must be an array.`);
          } else if (rule.type !== "array" && typeof val !== rule.type) {
            errors.push(`Field '${rule.field}' must be of type ${rule.type}.`);
          }
        }

        if (typeof val === "string") {
          if (rule.minLength !== undefined && val.trim().length < rule.minLength) {
            errors.push(`Field '${rule.field}' must be at least ${rule.minLength} characters.`);
          }
          if (rule.maxLength !== undefined && val.trim().length > rule.maxLength) {
            errors.push(`Field '${rule.field}' cannot exceed ${rule.maxLength} characters.`);
          }
          if (rule.pattern && !rule.pattern.test(val)) {
            errors.push(`Field '${rule.field}' format is invalid.`);
          }
          if (rule.enum && !rule.enum.includes(val)) {
            errors.push(`Field '${rule.field}' must be one of: ${rule.enum.join(", ")}.`);
          }
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        error: errors[0],
        errors,
      });
    }

    next();
  };
}
