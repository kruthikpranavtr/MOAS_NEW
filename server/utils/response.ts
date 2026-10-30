import { Response } from "express";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
  [key: string]: any;
}

export function sendSuccess<T = any>(
  res: Response,
  data?: T,
  messageOrStatus?: string | number,
  statusCode = 200,
  extra: Record<string, any> = {}
) {
  let message: string | undefined;
  let finalStatus = statusCode;

  if (typeof messageOrStatus === "number") {
    finalStatus = messageOrStatus;
  } else if (typeof messageOrStatus === "string") {
    message = messageOrStatus;
  }

  const isObject = data !== undefined && typeof data === "object" && !Array.isArray(data);
  const payload: ApiResponse<T> = {
    success: true,
    ...(isObject ? data : { data }),
    data: isObject && "data" in (data as any) ? (data as any).data : data,
    ...(message ? { message } : {}),
    ...extra,
  };
  return res.status(finalStatus).json(payload);
}

export function sendError(
  res: Response,
  error: string,
  statusCode = 400,
  code?: string,
  extra: Record<string, any> = {}
) {
  const defaultCode =
    statusCode === 403
      ? "FORBIDDEN"
      : statusCode === 401
      ? "UNAUTHORIZED"
      : statusCode === 404
      ? "NOT_FOUND"
      : undefined;

  const payload: ApiResponse = {
    success: false,
    error,
    ...(code || defaultCode ? { code: code || defaultCode } : {}),
    ...extra,
  };
  return res.status(statusCode).json(payload);
}
