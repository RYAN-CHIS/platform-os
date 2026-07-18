import {
  BUDGET_RANGES,
  type AdvisorInput,
  type BudgetRange,
  type ValidationDetail,
} from "../contracts/advisor";

const ALLOWED_FIELDS = new Set<keyof AdvisorInput>([
  "wishCategory",
  "stateTags",
  "colorPreferences",
  "stylePreference",
  "budgetRange",
  "wristSize",
  "excludedMaterials",
  "note",
]);

type ValidationResult =
  | { success: true; data: AdvisorInput }
  | { success: false; details: ValidationDetail[] };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeRequiredString(
  value: unknown,
  field: string,
  label: string,
  details: ValidationDetail[],
) {
  if (typeof value !== "string") {
    details.push({ field, message: `${label}必须为文本` });
    return "";
  }

  const normalized = value.trim();
  if (!normalized) {
    details.push({ field, message: `请填写${label}` });
  } else if (normalized.length > 50) {
    details.push({ field, message: `${label}最多 50 个字符` });
  }
  return normalized;
}

function normalizeStringArray(
  value: unknown,
  options: {
    field: string;
    label: string;
    required: boolean;
    min?: number;
    max: number;
  },
  details: ValidationDetail[],
) {
  if (value === undefined && !options.required) return [];
  if (!Array.isArray(value)) {
    details.push({ field: options.field, message: `${options.label}必须为文本列表` });
    return [];
  }

  const normalized: string[] = [];
  value.forEach((item, index) => {
    const itemField = `${options.field}[${index}]`;
    if (typeof item !== "string") {
      details.push({ field: itemField, message: `${options.label}必须为文本` });
      return;
    }

    const trimmed = item.trim();
    if (!trimmed) {
      details.push({ field: itemField, message: `${options.label}不可为空` });
      return;
    }
    if (trimmed.length > 50) {
      details.push({ field: itemField, message: `${options.label}每项最多 50 个字符` });
      return;
    }
    normalized.push(trimmed);
  });

  const deduplicated = [...new Set(normalized)];
  if (options.min && deduplicated.length < options.min) {
    details.push({
      field: options.field,
      message: `${options.label}请选择 ${options.min}–${options.max} 项`,
    });
  } else if (deduplicated.length > options.max) {
    details.push({ field: options.field, message: `${options.label}最多选择 ${options.max} 项` });
  }
  return deduplicated;
}

export function validateAdvisorInput(value: unknown): ValidationResult {
  const details: ValidationDetail[] = [];
  if (!isPlainObject(value)) {
    return {
      success: false,
      details: [{ field: "body", message: "请求体必须为 JSON 对象" }],
    };
  }

  Object.keys(value).forEach((field) => {
    if (!ALLOWED_FIELDS.has(field as keyof AdvisorInput)) {
      details.push({ field, message: "不支持该字段" });
    }
  });

  const wishCategory = normalizeRequiredString(
    value.wishCategory,
    "wishCategory",
    "心愿方向",
    details,
  );
  const stateTags = normalizeStringArray(
    value.stateTags,
    { field: "stateTags", label: "当前状态", required: true, min: 1, max: 3 },
    details,
  );
  const colorPreferences = normalizeStringArray(
    value.colorPreferences,
    { field: "colorPreferences", label: "颜色偏好", required: false, max: 5 },
    details,
  );
  const stylePreference = normalizeRequiredString(
    value.stylePreference,
    "stylePreference",
    "风格偏好",
    details,
  );

  const budgetRange = value.budgetRange;
  if (typeof budgetRange !== "string" || !BUDGET_RANGES.includes(budgetRange as BudgetRange)) {
    details.push({ field: "budgetRange", message: "请选择有效的预算范围" });
  }

  let wristSize: number | null = null;
  if (value.wristSize !== undefined && value.wristSize !== null) {
    if (typeof value.wristSize !== "number" || !Number.isFinite(value.wristSize)) {
      details.push({ field: "wristSize", message: "手围必须为 12–24 之间的数字" });
    } else if (value.wristSize < 12 || value.wristSize > 24) {
      details.push({ field: "wristSize", message: "手围必须在 12–24 之间" });
    } else {
      wristSize = value.wristSize;
    }
  }

  const excludedMaterials = normalizeStringArray(
    value.excludedMaterials,
    { field: "excludedMaterials", label: "排除材料", required: false, max: 10 },
    details,
  );

  let note = "";
  if (value.note !== undefined) {
    if (typeof value.note !== "string") {
      details.push({ field: "note", message: "补充说明必须为文本" });
    } else {
      note = value.note.trim();
      if (note.length > 300) {
        details.push({ field: "note", message: "补充说明最多 300 个字符" });
      }
    }
  }

  if (details.length > 0) return { success: false, details };

  return {
    success: true,
    data: {
      wishCategory,
      stateTags,
      colorPreferences,
      stylePreference,
      budgetRange: budgetRange as BudgetRange,
      wristSize,
      excludedMaterials,
      note,
    },
  };
}
