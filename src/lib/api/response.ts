import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(
  message: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json(
    {
      error: message,
      ...(details !== undefined ? { details } : {}),
    },
    { status },
  );
}

export function jsonValidationError(error: ZodError) {
  return jsonError("Validation failed", 400, error.flatten());
}
