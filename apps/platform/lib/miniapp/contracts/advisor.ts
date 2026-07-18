export const API_VERSION = "v1" as const;
export const MOCK_ENGINE_VERSION = "mock-v1" as const;

export const BUDGET_RANGES = [
  "¥199–299",
  "¥300–499",
  "¥500–799",
  "¥800 以上",
  "先看推荐",
] as const;

export type BudgetRange = (typeof BUDGET_RANGES)[number];
export type MaterialRole = "PRIMARY" | "SUPPORTING";
export type AvailabilityStatus = "MOCK_AVAILABLE" | "MOCK_LIMITED" | "MOCK_UNKNOWN";

export interface AdvisorInput {
  wishCategory: string;
  stateTags: string[];
  colorPreferences: string[];
  stylePreference: string;
  budgetRange: BudgetRange;
  wristSize: number | null;
  excludedMaterials: string[];
  note: string;
}

export interface RecommendationMaterial {
  id: string;
  name: string;
  image: string;
  shortDescription: string;
  role: MaterialRole;
  estimatedUnitPrice: number;
  availabilityStatus: AvailabilityStatus;
}

export interface RecommendationResult {
  id: string;
  title: string;
  summary: string;
  primaryMaterials: RecommendationMaterial[];
  supportingMaterials: RecommendationMaterial[];
  colorDirection: string;
  styleDirection: string;
  estimatedPriceRange: string;
  reasons: string[];
  cautions: string[];
  disclaimer: string;
  engineVersion: typeof MOCK_ENGINE_VERSION;
}

export interface RecommendationResponseData {
  recommendation: RecommendationResult;
  inputSummary: Pick<
    AdvisorInput,
    "wishCategory" | "stateTags" | "stylePreference" | "budgetRange"
  >;
}

export interface ValidationDetail {
  field: string;
  message: string;
}

export type ApiErrorCode = "INVALID_JSON" | "VALIDATION_ERROR" | "INTERNAL_ERROR";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: ValidationDetail[];
}
