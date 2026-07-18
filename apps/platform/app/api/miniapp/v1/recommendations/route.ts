import type { RecommendationResponseData } from "@/lib/miniapp/contracts/advisor";
import { logMiniappRequest } from "@/lib/miniapp/http/logger";
import {
  createRequestId,
  errorResponse,
  successResponse,
} from "@/lib/miniapp/http/response";
import { getMockRecommendation } from "@/lib/miniapp/services/recommendation-service";
import { validateAdvisorInput } from "@/lib/miniapp/validation/advisor";

export const runtime = "nodejs";

const elapsedMs = (startedAt: number) => Date.now() - startedAt;

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = Date.now();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    logMiniappRequest({
      requestId,
      status: 400,
      validation: "failure",
      durationMs: elapsedMs(startedAt),
    });
    return errorResponse(
      { code: "INVALID_JSON", message: "请求体不是有效 JSON" },
      requestId,
      400,
    );
  }

  const validation = validateAdvisorInput(body);
  if (!validation.success) {
    logMiniappRequest({
      requestId,
      status: 400,
      validation: "failure",
      durationMs: elapsedMs(startedAt),
    });
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "请求参数不完整",
        details: validation.details,
      },
      requestId,
      400,
    );
  }

  try {
    const recommendation = await getMockRecommendation(validation.data);
    const data: RecommendationResponseData = {
      recommendation,
      inputSummary: {
        wishCategory: validation.data.wishCategory,
        stateTags: validation.data.stateTags,
        stylePreference: validation.data.stylePreference,
        budgetRange: validation.data.budgetRange,
      },
    };

    logMiniappRequest({
      requestId,
      status: 200,
      validation: "success",
      durationMs: elapsedMs(startedAt),
      recommendationId: recommendation.id,
    });
    return successResponse(data, requestId);
  } catch {
    logMiniappRequest({
      requestId,
      status: 500,
      validation: "success",
      durationMs: elapsedMs(startedAt),
    });
    return errorResponse(
      { code: "INTERNAL_ERROR", message: "服务暂时不可用，请稍后再试" },
      requestId,
      500,
    );
  }
}
