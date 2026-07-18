const ENDPOINT = "/api/miniapp/v1/recommendations";

interface MiniappLogEvent {
  requestId: string;
  status: number;
  validation: "success" | "failure" | "not_completed";
  durationMs: number;
  recommendationId?: string;
}

export function logMiniappRequest(event: MiniappLogEvent) {
  const payload = {
    requestId: event.requestId,
    endpoint: ENDPOINT,
    status: event.status,
    validation: event.validation,
    durationMs: event.durationMs,
    ...(event.recommendationId ? { recommendationId: event.recommendationId } : {}),
  };

  const serialized = JSON.stringify(payload);
  if (event.status >= 500) {
    console.error("[miniapp/recommendations]", serialized);
  } else if (event.status >= 400) {
    console.warn("[miniapp/recommendations]", serialized);
  } else {
    console.info("[miniapp/recommendations]", serialized);
  }
}
