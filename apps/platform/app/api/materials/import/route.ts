import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@yunwu/db";
import * as XLSX from "xlsx";

const COLUMN_ALIASES: Record<string, string> = {
  "原料编码": "code",
  "编码": "code",
  code: "code",
  material_code: "code",
  "材料编码": "code",
  "品类": "category",
  category: "category",
  "供应商": "supplier",
  supplier: "supplier",
  "规格mm": "spec",
  spec: "spec",
  "形状": "shape",
  shape: "shape",
  "名称": "name",
  name: "name",
  material_name: "name",
  "材料名称": "name",
  "备注": "remark",
  remark: "remark",
  "计价方式": "pricingMethod",
  pricing_method: "pricingMethod",
  "进货串数/个数": "purchaseQty",
  purchase_qty: "purchaseQty",
  "采购数量/串数": "purchaseQty",
  "计价单价": "unitCost",
  unit_cost: "unitCost",
  price: "unitCost",
  "单价": "unitCost",
  "计价单位": "pricingUnit",
  pricing_unit: "pricingUnit",
  "采购总价": "purchaseTotalPrice",
  purchase_total_price: "purchaseTotalPrice",
  "每串颗数": "beadsPerStrand",
  beads_per_strand: "beadsPerStrand",
  "每串克重": "weightPerStrand",
  weight_per_strand: "weightPerStrand",
  "总颗数": "totalPieces",
  total_pieces: "totalPieces",
  "总克重": "totalWeightG",
  total_weight_g: "totalWeightG",
  "单颗成本（颗）": "costPerUsageUnit",
  "单颗成本": "costPerUsageUnit",
  cost_per_usage_unit: "costPerUsageUnit",
  "库存": "remaining",
  remaining: "remaining",
  stock: "remaining",
  quantity: "remaining",
  "数量": "remaining",
};

const TransactionType = {
  ADJUST: "ADJUST",
} as const;

const MATERIAL_CLASS_RULES: Array<{ type: string; keywords: string[] }> = [
  {
    type: "BEAD",
    keywords: [
      "珠子",
      "水晶",
      "玛瑙",
      "珍珠",
      "玉石",
      "月光石",
      "草莓晶",
      "宝石",
      "猛犸",
      "猛犸象牙",
      "沉香",
      "老山檀",
      "檀香",
      "大漆珠",
      "蜜蜡",
      "南红",
      "青金石",
      "绿松",
      "绿松石",
      "海纹石",
      "翡翠",
      "白水晶",
      "粉水晶",
      "紫水晶",
      "茶晶",
      "堇青石",
      "白兔毛",
    ],
  },
  { type: "METAL", keywords: ["配件", "三通", "金珠", "银件", "隔片", "吊坠", "扣头", "链", "环"] },
  { type: "CERAMIC", keywords: ["瓷", "陶瓷", "杯", "碗"] },
  { type: "LEATHER", keywords: ["皮革", "牛皮", "羊皮", "皮绳"] },
  { type: "PACKAGING", keywords: ["包装", "袋", "盒"] },
];

function displayMaterialType(type: string) {
  if (type === "BEAD") return "珠子";
  if (type === "METAL") return "配件";
  if (type === "CERAMIC") return "瓷器";
  if (type === "LEATHER") return "皮具";
  return "其他";
}

function normalizeCell(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  return String(value).trim();
}

function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toText(value: unknown): string {
  return normalizeCell(value);
}

function toNullableText(value: unknown): string | null {
  const text = normalizeCell(value);
  return text === "" ? null : text;
}

function toNullableNumber(value: unknown): number | null {
  const num = toNumber(value);
  return num === null ? null : num;
}

function parsePricingMethod(value: unknown): string | null {
  const text = normalizeCell(value);
  if (!text) return null;
  if (text.includes("重量") || text.includes("按克")) return "by_weight";
  if (text.includes("串")) return "by_strand";
  if (text.includes("个") || text.includes("件") || text.includes("颗")) return "by_piece";
  return text;
}

function buildImportMaterialData(normalized: Record<string, unknown>, materialType: string) {
  const code = normalizeCell(normalized.code);
  const name = normalizeCell(normalized.name);
  const category = toText(normalized.category);
  const supplier = toText(normalized.supplier);
  const specification = toNullableText(normalized.spec);
  const shape = toNullableText(normalized.shape);
  const remark = toNullableText(normalized.remark);
  const pricingMethod = parsePricingMethod(normalized.pricingMethod);
  const purchaseQty = toNullableNumber(normalized.purchaseQty);
  const pricingUnitPrice = toNullableNumber(normalized.unitCost) ?? toNullableNumber(normalized.pricingUnitPrice) ?? toNullableNumber(normalized.costPerUsageUnit);
  const pricingUnit = toNullableText(normalized.pricingUnit);
  const purchaseTotalPrice = toNullableNumber(normalized.purchaseTotalPrice);
  const beadsPerStrand = toNullableNumber(normalized.beadsPerStrand);
  const weightPerStrand = toNullableNumber(normalized.weightPerStrand);
  const totalPieces = toNullableNumber(normalized.totalPieces);
  const totalWeightG = toNullableNumber(normalized.totalWeightG);
  const costPerUsageUnit = toNullableNumber(normalized.costPerUsageUnit);
  const remaining = totalPieces ?? purchaseQty ?? 0;
  const resolvedUnitCost = costPerUsageUnit ?? pricingUnitPrice;

  return {
    code,
    name,
    category,
    materialType,
    supplier,
    specification,
    shape,
    remark,
    pricingMethod: pricingMethod || "by_weight",
    purchaseQty,
    unitCost: resolvedUnitCost,
    unitPrice: pricingUnitPrice,
    pricingUnit,
    purchaseTotalPrice,
    purchasePrice: purchaseTotalPrice,
    beadsPerStrand,
    weightPerStrand,
    totalPieces,
    totalWeightG,
    costPerUsageUnit,
    remaining,
  };
}

function classifyMaterial(input: { code: string; name: string; category: string; supplier: string; spec: string; shape: string }) {
  const haystack = [input.code, input.name, input.category, input.supplier, input.spec, input.shape]
    .filter(Boolean)
    .join(" ");

  for (const rule of MATERIAL_CLASS_RULES) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      return rule.type;
    }
  }

  return "OTHER";
}

function normalizeHeaderText(value: unknown) {
  return normalizeCell(value)
    .replace(/\s+/g, "")
    .replace(/[（(].*?[)）]/g, "")
    .trim();
}

function buildNormalizedRow(headerRow: unknown[], dataRow: unknown[]) {
  const normalized: Record<string, unknown> = {};
  headerRow.forEach((header, index) => {
    const rawHeader = normalizeCell(header);
    const aliasKey = COLUMN_ALIASES[rawHeader] || COLUMN_ALIASES[normalizeHeaderText(header)] || rawHeader;
    if (!aliasKey) return;
    normalized[aliasKey] = dataRow[index];
  });
  return normalized;
}

function parseWorkbookRows(sheet: XLSX.WorkSheet) {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const row1 = Array.isArray(matrix[0]) ? matrix[0] : [];
  const row2 = Array.isArray(matrix[1]) ? matrix[1] : [];
  const row2HasHeaders = row2.some((cell) => {
    const text = normalizeHeaderText(cell);
    return text === "原料编码" || text === "名称" || text === "供应商" || text === "计价方式";
  });

  if (row2HasHeaders) {
    const dataRows = matrix.slice(3).filter((row) => Array.isArray(row) && row.some((cell) => normalizeCell(cell) !== ""));
    return { mode: "double-header" as const, headerRow: row2, dataRows, rowOffset: 4 };
  }

  const headerRow = row1.some((cell) => normalizeCell(cell) !== "") ? row1 : row2;
  const dataStart = headerRow === row1 ? 1 : 2;
  const dataRows = matrix.slice(dataStart).filter((row) => Array.isArray(row) && row.some((cell) => normalizeCell(cell) !== ""));
  return { mode: "single-header" as const, headerRow, dataRows, rowOffset: dataStart + 1 };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "请上传文件" }, { status: 400 });
    }

    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith(".xlsx")) {
      return NextResponse.json({ ok: false, error: "只支持 .xlsx 格式文件" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    console.info("[materials/import] sheet names:", workbook.SheetNames);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      return NextResponse.json({ ok: false, error: "未找到可用工作表" }, { status: 400 });
    }
    const parsedSheet = parseWorkbookRows(sheet);
    console.info("[materials/import] sheet:", sheetName, "mode:", parsedSheet.mode, "row count:", parsedSheet.dataRows.length);
    console.info("[materials/import] parsed headers:", parsedSheet.headerRow.map((cell) => normalizeCell(cell)));
    console.info("[materials/import] first data row:", parsedSheet.dataRows[0] || null);

    if (parsedSheet.dataRows.length === 0) {
      return NextResponse.json({ ok: false, error: "文件为空或格式不正确" }, { status: 400 });
    }

    const existingMaterials = await prisma.erpMaterial.findMany({
      select: { id: true, code: true, name: true, remaining: true, unitCost: true },
      take: 5000,
      orderBy: { code: "asc" },
    });

    const preview = parsedSheet.dataRows.map((dataRow, index) => {
      const rowNum = index + parsedSheet.rowOffset;
      const normalized = buildNormalizedRow(parsedSheet.headerRow, dataRow);

      const code = normalizeCell(normalized.code);
      const name = normalizeCell(normalized.name);
      const previewCategory = toText(normalized.category);
      const previewSupplier = toText(normalized.supplier);
      const previewSpec = toNullableText(normalized.spec) || "";
      const previewShape = toNullableText(normalized.shape) || "";
      const materialType = classifyMaterial({
        code,
        name,
        category: previewCategory,
        supplier: previewSupplier,
        spec: previewSpec,
        shape: previewShape,
      });
      const parsed = buildImportMaterialData(normalized, materialType);
      const completeFields = [
        parsed.supplier,
        parsed.specification,
        parsed.shape,
        parsed.purchaseTotalPrice,
        parsed.beadsPerStrand,
        parsed.weightPerStrand,
        parsed.totalPieces,
        parsed.totalWeightG,
        parsed.costPerUsageUnit,
      ].filter((value) => value !== null && value !== undefined && value !== "").length;
      const canCreate = Boolean(code || name);
      let matched = null as null | { id: number; code: string; name: string; remaining: number; unitCost: number | null };
      let matchMethod: "编码" | "名称" | "未匹配" = "未匹配";
      if (code) {
        matched = existingMaterials.find((m) => m.code === code) || null;
        if (matched) matchMethod = "编码";
      }
      if (!matched && name) {
        matched = existingMaterials.find((m) => m.name === name) || null;
        if (matched) matchMethod = "名称";
      }

      console.info("[materials/import] row:", rowNum, { code, name, action: matched ? "update" : canCreate ? "create" : "skip", materialType, matchMethod });

      if (!matched) {
        return {
          rowNum,
          code: code || "-",
          name: name || "-",
          category: parsed.category || "-",
          supplier: parsed.supplier || "-",
          spec: parsed.specification || "-",
          shape: parsed.shape || "-",
          remark: parsed.remark || "-",
          pricingMethod: parsed.pricingMethod || "-",
          purchaseQty: parsed.purchaseQty,
          pricingUnit: parsed.pricingUnit || "-",
          purchaseTotalPrice: parsed.purchaseTotalPrice,
          beadsPerStrand: parsed.beadsPerStrand,
          weightPerStrand: parsed.weightPerStrand,
          totalPieces: parsed.totalPieces,
          totalWeightG: parsed.totalWeightG,
          excelRemaining: parsed.remaining,
          excelUnitCost: parsed.unitCost,
          currentRemaining: null,
          currentUnitCost: null,
          matched: false,
          matchedId: null,
          difference: null,
          matchMethod: "未匹配",
          action: canCreate ? "create" : "skip",
          canCreate,
          materialType: displayMaterialType(materialType),
          remark: parsed.remark,
          completeFields,
          fullFieldStatus: completeFields >= 5 ? "已读取供应商/规格/形状/采购价/珠子明细" : "字段不完整",
        };
      }

      return {
        rowNum,
        code: matched.code,
        name: matched.name,
        category: parsed.category,
        supplier: parsed.supplier,
        spec: parsed.specification,
        shape: parsed.shape,
        remark: parsed.remark,
        pricingMethod: parsed.pricingMethod,
        purchaseQty: parsed.purchaseQty,
        pricingUnit: parsed.pricingUnit,
        purchaseTotalPrice: parsed.purchaseTotalPrice,
        beadsPerStrand: parsed.beadsPerStrand,
        weightPerStrand: parsed.weightPerStrand,
        totalPieces: parsed.totalPieces,
        totalWeightG: parsed.totalWeightG,
        excelRemaining: parsed.remaining,
        excelUnitCost: parsed.unitCost,
        currentRemaining: matched.remaining,
        currentUnitCost: matched.unitCost,
        matched: true,
        matchedId: matched.id,
        difference: parsed.remaining - matched.remaining,
        matchMethod,
        action: "update",
        canCreate: false,
        materialType: displayMaterialType(materialType),
        remark: parsed.remark,
        completeFields,
        fullFieldStatus: completeFields >= 5 ? "已读取供应商/规格/形状/采购价/珠子明细" : "字段不完整",
      };
    });

    return NextResponse.json({ ok: true, preview });
  } catch (error: any) {
    console.error("Import preview error:", error);
    return NextResponse.json(
      { ok: false, error: "导入预览失败", detail: error?.message || String(error) },
      { status: 500 }
    );
  }
}

function materialTypeFromDisplay(display: string): string {
  const valid = ["BEAD", "METAL", "CERAMIC", "LEATHER", "OTHER", "PACKAGING"];
  if (valid.includes(display)) return display;
  const map: Record<string, string> = { 珠子: "BEAD", 配件: "METAL", 瓷器: "CERAMIC", 皮具: "LEATHER" };
  return map[display] || "OTHER";
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : null;

    if (!items) {
      return NextResponse.json({ ok: false, error: "无效的数据格式" }, { status: 400 });
    }

    const results = { matched: 0, updated: 0, created: 0, skipped: 0, unmatched: 0, errors: [] as string[] };

    // Pre-fetch current remaining quantities for all matched materials in ONE
    // query. This avoids holding an interactive transaction open across a long
    // loop, which fails on Neon with "Transaction not found".
    const matchedIds = items
      .filter((it: any) => it.action === "update" && it.matchedId)
      .map((it: any) => it.matchedId as number);
    const currentRemaining = new Map<number, number>();
    if (matchedIds.length) {
      const rows = await prisma.erpMaterial.findMany({
        where: { id: { in: matchedIds } },
        select: { id: true, remaining: true },
      });
      for (const r of rows) currentRemaining.set(r.id, r.remaining);
    }

    const CHUNK_SIZE = 10;
    for (let start = 0; start < items.length; start += CHUNK_SIZE) {
      const chunk = items.slice(start, start + CHUNK_SIZE);
      const ops: any[] = [];

      for (const item of chunk) {
        if (item.action === "skip") {
          results.skipped++;
          continue;
        }
        if (item.action === "unmatched") {
          results.unmatched++;
          continue;
        }

        if (item.action === "create") {
          const code = normalizeCell(item.code);
          const name = normalizeCell(item.name);
          if (!code && !name) {
            results.skipped++;
            continue;
          }
          const createData = {
            code,
            name,
            category: toText(item.category),
            materialType: materialTypeFromDisplay(item.materialType) || "OTHER",
            supplier: toText(item.supplier),
            specification: toNullableText(item.spec),
            shape: toNullableText(item.shape),
            remark: toNullableText(item.remark),
            remaining: Number(item.excelRemaining) || 0,
            unitCost: item.excelUnitCost === null || item.excelUnitCost === undefined || item.excelUnitCost === ""
              ? null
              : Number(item.excelUnitCost),
            unitPrice: item.excelUnitCost === null || item.excelUnitCost === undefined || item.excelUnitCost === ""
              ? null
              : Number(item.excelUnitCost),
            pricingMethod: parsePricingMethod(item.pricingMethod) || "by_weight",
            purchaseQty: toNullableNumber(item.purchaseQty),
            pricingUnit: toNullableText(item.pricingUnit),
            purchaseTotalPrice: toNullableNumber(item.purchaseTotalPrice),
            purchasePrice: toNullableNumber(item.purchaseTotalPrice),
            beadsPerStrand: toNullableNumber(item.beadsPerStrand),
            weightPerStrand: toNullableNumber(item.weightPerStrand),
            totalPieces: toNullableNumber(item.totalPieces),
            totalWeightG: toNullableNumber(item.totalWeightG),
            costPerUsageUnit: toNullableNumber(item.excelUnitCost) ?? toNullableNumber(item.costPerUsageUnit),
          };
          // Create the material together with its initial ADJUST transaction as a
          // single nested operation (batch transactions can't reference a prior
          // op's generated id).
          ops.push(
            prisma.erpMaterial.create({
              data: {
                ...createData,
                transactions: {
                  create: {
                    type: TransactionType.ADJUST,
                    quantity: Number(item.excelRemaining) || 0,
                    beforeQty: 0,
                    afterQty: Number(item.excelRemaining) || 0,
                    relatedDoc: "Excel导入新增",
                    remark: item.remark || `Excel导入新增：库存 0 → ${Number(item.excelRemaining) || 0}`,
                  },
                },
              } as any,
            })
          );
          results.created++;
          results.matched++;
          continue;
        }

        if (item.action !== "update" || !item.matchedId) continue;

        const beforeQty = currentRemaining.get(item.matchedId) ?? 0;
        const afterQty = Number(item.excelRemaining) || 0;
        const quantityDiff = afterQty - beforeQty;
        const updateData: Record<string, unknown> = {};

        // Persist the auto-classified material type (preview computes it but the
        // update payload must carry it through).
        updateData.materialType = materialTypeFromDisplay(item.materialType) || "OTHER";

        for (const [key, value] of Object.entries({
          category: toText(item.category),
          supplier: toText(item.supplier),
          specification: toNullableText(item.spec),
          shape: toNullableText(item.shape),
          remark: toNullableText(item.remark),
          pricingMethod: parsePricingMethod(item.pricingMethod) || "by_weight",
          purchaseQty: toNullableNumber(item.purchaseQty),
          pricingUnit: toNullableText(item.pricingUnit),
          purchaseTotalPrice: toNullableNumber(item.purchaseTotalPrice),
          beadsPerStrand: toNullableNumber(item.beadsPerStrand),
          weightPerStrand: toNullableNumber(item.weightPerStrand),
          totalPieces: toNullableNumber(item.totalPieces),
          totalWeightG: toNullableNumber(item.totalWeightG),
          costPerUsageUnit: toNullableNumber(item.excelUnitCost) ?? toNullableNumber(item.costPerUsageUnit),
        })) {
          if (value !== null && value !== undefined && value !== "") {
            updateData[key] = value;
          }
        }

        if (item.excelUnitCost !== null && item.excelUnitCost !== undefined && item.excelUnitCost !== "") {
          updateData.unitPrice = Number(item.excelUnitCost);
        }
        if (item.purchaseTotalPrice !== null && item.purchaseTotalPrice !== undefined && item.purchaseTotalPrice !== "") {
          updateData.purchasePrice = Number(item.purchaseTotalPrice);
        }
        if (item.excelUnitCost !== null && item.excelUnitCost !== undefined && item.excelUnitCost !== "") {
          updateData.unitCost = Number(item.excelUnitCost);
        }
        if (item.excelRemaining !== null && item.excelRemaining !== undefined && item.excelRemaining !== "") {
          updateData.remaining = afterQty;
        }

        ops.push(prisma.erpMaterial.update({ where: { id: item.matchedId }, data: updateData }));
        if (quantityDiff !== 0) {
          ops.push(
            prisma.erpInventoryTransaction.create({
              data: {
                materialId: item.matchedId,
                type: TransactionType.ADJUST,
                quantity: quantityDiff,
                beforeQty,
                afterQty,
                relatedDoc: "Excel导入调整",
                remark: item.remark || `Excel导入调整：库存 ${beforeQty} → ${afterQty}`,
              },
            })
          );
        }
        results.updated++;
        results.matched++;
      }

      if (ops.length) {
        await prisma.$transaction(ops);
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (error: any) {
    console.error("Import apply error:", error);
    return NextResponse.json(
      { ok: false, error: "导入失败", detail: error?.message || String(error) },
      { status: 500 }
    );
  }
}
