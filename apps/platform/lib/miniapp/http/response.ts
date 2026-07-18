import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { API_VERSION, type ApiError } from "../contracts/advisor";

export function createRequestId() {
  return randomUUID();
}

function createMeta(requestId: string, mock?: true) {
  return {
    requestId,
    timestamp: new Date().toISOString(),
    apiVersion: API_VERSION,
    ...(mock ? { mock } : {}),
  };
}

export function successResponse<T>(data: T, requestId: string) {
  return NextResponse.json({ success: true, data, meta: createMeta(requestId, true) });
}

export function errorResponse(error: ApiError, requestId: string, status: number) {
  return NextResponse.json(
    { success: false, error, meta: createMeta(requestId) },
    { status },
  );
}
