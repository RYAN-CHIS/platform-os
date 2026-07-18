import type { AdvisorInput, RecommendationResult } from "../contracts/advisor";
import { MOCK_RECOMMENDATIONS } from "../mocks/recommendations";

function selectRecommendationId(input: AdvisorInput) {
  if (input.stylePreference === "清简克制") return "mock-rec-001";
  if (input.stylePreference === "温润柔和") return "mock-rec-002";
  return "mock-rec-003";
}

export async function getMockRecommendation(
  input: AdvisorInput,
): Promise<RecommendationResult> {
  const selected = MOCK_RECOMMENDATIONS[selectRecommendationId(input)];
  const estimatedPriceRange =
    input.budgetRange === "先看推荐" ? selected.estimatedPriceRange : input.budgetRange;

  return {
    ...selected,
    estimatedPriceRange,
    primaryMaterials: selected.primaryMaterials.map((material) => ({ ...material })),
    supportingMaterials: selected.supportingMaterials.map((material) => ({ ...material })),
    reasons: [...selected.reasons],
    cautions: [...selected.cautions],
  };
}
