import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { POST } from "../../app/api/miniapp/v1/recommendations/route";
import { MOCK_RECOMMENDATIONS } from "./mocks/recommendations";
import { getMockRecommendation } from "./services/recommendation-service";
import { validateAdvisorInput } from "./validation/advisor";

const endpoint = "http://localhost/api/miniapp/v1/recommendations";
const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const platformRoot = path.resolve(testDirectory, "../..");
const routePath = path.join(
  platformRoot,
  "app/api/miniapp/v1/recommendations/route.ts",
);
const middlewarePath = path.join(platformRoot, "middleware.ts");

const validInput = {
  wishCategory: "安定与平衡",
  stateTags: ["最近有些忙乱"],
  colorPreferences: ["青绿色"],
  stylePreference: "清简克制",
  budgetRange: "¥300–499",
  wristSize: 16.5,
  excludedMaterials: [],
  note: "",
};

function jsonRequest(body: unknown) {
  return new Request(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function callRoute(body: unknown) {
  const response = await POST(jsonRequest(body));
  return { response, payload: await response.json() };
}

function fields(payload: { error?: { details?: Array<{ field: string }> } }) {
  return payload.error?.details?.map((detail) => detail.field) ?? [];
}

describe("MiniApp mock recommendation route", () => {
  it("returns the documented success envelope for valid input", async () => {
    const { response, payload } = await callRoute(validInput);

    assert.equal(response.status, 200);
    assert.equal(payload.success, true);
    assert.equal(payload.meta.mock, true);
    assert.equal(payload.meta.apiVersion, "v1");
    assert.match(payload.meta.requestId, /^[0-9a-f-]{36}$/);
    assert.equal(Number.isNaN(Date.parse(payload.meta.timestamp)), false);
    assert.equal(payload.data.recommendation.engineVersion, "mock-v1");
    assert.equal(payload.data.recommendation.id, "mock-rec-001");
  });

  it("returns the same recommendation for the same normalized input", async () => {
    const normalized = validateAdvisorInput(validInput);
    assert.equal(normalized.success, true);
    if (!normalized.success) return;

    const first = await getMockRecommendation(normalized.data);
    const second = await getMockRecommendation(normalized.data);
    assert.deepEqual(first, second);
  });

  it("deduplicates state tags before validating and echoing the summary", async () => {
    const { response, payload } = await callRoute({
      ...validInput,
      stateTags: ["忙乱", " 忙乱 ", "需要安静"],
    });

    assert.equal(response.status, 200);
    assert.deepEqual(payload.data.inputSummary.stateTags, ["忙乱", "需要安静"]);
  });

  it("rejects empty and over-limit state tags", async () => {
    const empty = await callRoute({ ...validInput, stateTags: [] });
    const tooMany = await callRoute({
      ...validInput,
      stateTags: ["一", "二", "三", "四"],
    });

    assert.equal(empty.response.status, 400);
    assert.equal(empty.payload.error.code, "VALIDATION_ERROR");
    assert.ok(fields(empty.payload).includes("stateTags"));
    assert.equal(tooMany.response.status, 400);
    assert.ok(fields(tooMany.payload).includes("stateTags"));
  });

  it("rejects wrist sizes outside 12–24 and string numbers", async () => {
    for (const wristSize of [11.9, 24.1, "16.5"]) {
      const { response, payload } = await callRoute({ ...validInput, wristSize });
      assert.equal(response.status, 400);
      assert.ok(fields(payload).includes("wristSize"));
    }
  });

  it("rejects non-finite wrist sizes at the validator boundary", () => {
    for (const wristSize of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = validateAdvisorInput({ ...validInput, wristSize });
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(result.details.some((detail) => detail.field === "wristSize"));
      }
    }
  });

  it("rejects invalid budget, long note, and blank required strings", async () => {
    const cases = [
      { input: { ...validInput, budgetRange: "¥100–199" }, field: "budgetRange" },
      { input: { ...validInput, note: "长".repeat(301) }, field: "note" },
      { input: { ...validInput, wishCategory: "   " }, field: "wishCategory" },
      { input: { ...validInput, stylePreference: "" }, field: "stylePreference" },
    ];

    for (const testCase of cases) {
      const { response, payload } = await callRoute(testCase.input);
      assert.equal(response.status, 400);
      assert.ok(fields(payload).includes(testCase.field));
    }
  });

  it("rejects unknown fields instead of passing nested data to the service", async () => {
    const { response, payload } = await callRoute({
      ...validInput,
      internal: { score: 99 },
    });

    assert.equal(response.status, 400);
    assert.ok(fields(payload).includes("internal"));
  });

  it("returns INVALID_JSON for malformed JSON", async () => {
    const response = await POST(
      new Request(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{invalid",
      }),
    );
    const payload = await response.json();

    assert.equal(response.status, 400);
    assert.equal(payload.success, false);
    assert.equal(payload.error.code, "INVALID_JSON");
  });

  it("does not return notes, excluded materials, stack traces, prompts, or weights", async () => {
    const privateNote = "PRIVATE_NOTE_SHOULD_NOT_RETURN";
    const excludedMaterial = "PRIVATE_EXCLUSION_SHOULD_NOT_RETURN";
    const { payload } = await callRoute({
      ...validInput,
      note: privateNote,
      excludedMaterials: [excludedMaterial],
    });
    const serialized = JSON.stringify(payload);

    assert.doesNotMatch(serialized, new RegExp(privateNote));
    assert.doesNotMatch(serialized, new RegExp(excludedMaterial));
    assert.doesNotMatch(serialized, /stack|prompt|internalWeight|评分矩阵/i);
  });
});

describe("MiniApp mock recommendation contracts", () => {
  it("provides three structurally complete mock recommendations", () => {
    const recommendations = Object.values(MOCK_RECOMMENDATIONS);
    assert.equal(recommendations.length, 3);

    recommendations.forEach((recommendation) => {
      assert.ok(recommendation.primaryMaterials.length >= 1);
      assert.ok(recommendation.primaryMaterials.length <= 2);
      assert.ok(recommendation.supportingMaterials.length >= 1);
      assert.ok(recommendation.supportingMaterials.length <= 3);
      assert.ok(recommendation.reasons.length >= 2);
      assert.ok(recommendation.reasons.length <= 4);
      assert.ok(recommendation.cautions.length >= 1);
      assert.ok(recommendation.cautions.length <= 3);
      assert.equal(recommendation.engineVersion, "mock-v1");
    });
  });

  it("contains no positive promise language in public mock content", () => {
    const publicContent = JSON.stringify(MOCK_RECOMMENDATIONS);
    const prohibited = [
      "招财",
      "转运",
      "改命",
      "治疗",
      "保佑",
      "化解灾祸",
      "改善疾病",
      "改变事业运",
      "提升感情运",
      "一定能",
      "保证有效",
      "能量疗愈",
      "磁场改变",
    ];

    prohibited.forEach((term) => assert.equal(publicContent.includes(term), false));
  });

  it("keeps the route database-free and middleware-native", () => {
    const routeSource = fs.readFileSync(routePath, "utf8");
    const middlewareSource = fs.readFileSync(middlewarePath, "utf8");

    assert.doesNotMatch(routeSource, /prisma|@yunwu\/db|queryRaw|database/i);
    assert.match(middlewareSource, /pathname\.startsWith\("\/api\/miniapp"\)/);
  });
});
