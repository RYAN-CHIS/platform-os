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
  { type: "BEAD", keywords: ["珠子", "水晶", "玛瑙", "珍珠", "玉石", "月光石", "草莓晶", "宝石"] },
  { type: "METAL", keywords: ["配件", "三通", "金珠", "银件", "隔片", "吊坠", "扣头", "链", "环"] },
  { type: "CERAMIC", keywords: ["瓷", "陶瓷", "杯", "碗"] },
  { type: "LEATHER", keywords: ["皮革", "牛皮", "羊皮", "皮绳"] },
  { type: "PACKAGING", keywords: ["包装", "袋", "盒"] },
];

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
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    console.info("[materials/import] sheet:", sheetName, "row count:", rows.length);
    console.info("[materials/import] parsed headers:", Object.keys(rows[0] || {}));
    console.info("[materials/import] first row:", rows[0] || null);

    if (rows.length === 0) {
      return NextResponse.json({ ok: false, error: "文件为空或格式不正确" }, { status: 400 });
    }

    const existingMaterials = await prisma.erpMaterial.findMany({
      select: { id: true, code: true, name: true, remaining: true, unitCost: true },
      take: 5000,
      orderBy: { code: "asc" },
    });

    const preview = rows.map((row, index) => {
      const rowNum = index + 2;
      const normalized: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(row)) {
        const normalizedKey = COLUMN_ALIASES[normalizeCell(key)] || normalizeCell(key);
        normalized[normalizedKey] = value;
      }

      const code = normalizeCell(normalized.code);
      const name = normalizeCell(normalized.name);
      const category = toText(normalized.category);
      const supplier = toText(normalized.supplier);
      const spec = toText(normalized.spec);
      const shape = toText(normalized.shape);
      const remark = toText(normalized.remark);
      const pricingMethod = toText(normalized.pricingMethod);
      const purchaseQty = toNumber(normalized.purchaseQty);
      const unitCost = toNumber(normalized.costPerUsageUnit) ?? toNumber(normalized.unitCost);
      const pricingUnit = toText(normalized.pricingUnit);
      const purchaseTotalPrice = toNumber(normalized.purchaseTotalPrice);
      const beadsPerStrand = toNumber(normalized.beadsPerStrand);
      const weightPerStrand = toNumber(normalized.weightPerStrand);
      const totalPieces = toNumber(normalized.totalPieces);
      const totalWeightG = toNumber(normalized.totalWeightG);
      const remaining = totalPieces ?? purchaseQty ?? 0;
      const materialType = classifyMaterial({ code, name, category, supplier, spec, shape });
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
          category: category || "-",
          supplier: supplier || "-",
          spec: spec || "-",
          shape: shape || "-",
          remark: remark || "-",
          pricingMethod: pricingMethod || "-",
          purchaseQty,
          pricingUnit: pricingUnit || "-",
          purchaseTotalPrice,
          beadsPerStrand,
          weightPerStrand,
          totalPieces,
          totalWeightG,
          excelRemaining: remaining,
          excelUnitCost: unitCost,
          currentRemaining: null,
          currentUnitCost: null,
          matched: false,
          matchedId: null,
          difference: null,
          matchMethod: "未匹配",
          action: canCreate ? "create" : "skip",
          canCreate,
          materialType,
          remark,
        };
      }

      return {
        rowNum,
        code: matched.code,
        name: matched.name,
        category,
        supplier,
        spec,
        shape,
        remark,
        pricingMethod,
        purchaseQty,
        pricingUnit,
        purchaseTotalPrice,
        beadsPerStrand,
        weightPerStrand,
        totalPieces,
        totalWeightG,
        excelRemaining: remaining,
        excelUnitCost: unitCost,
        currentRemaining: matched.remaining,
          currentUnitCost: matched.unitCost,
        matched: true,
        matchedId: matched.id,
        difference: remaining - matched.remaining,
        matchMethod,
        action: "update",
        canCreate: false,
        materialType,
        remark,
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

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : null;

    if (!items) {
      return NextResponse.json({ ok: false, error: "无效的数据格式" }, { status: 400 });
    }

    const results = { matched: 0, updated: 0, created: 0, skipped: 0, unmatched: 0, errors: [] as string[] };

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        if (item.action === "skip") {
          results.skipped++;
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
            materialType: item.materialType || "OTHER",
            supplier: toText(item.supplier),
            specification: toText(item.spec),
            shape: toText(item.shape),
            remaining: Number(item.excelRemaining) || 0,
            unitCost: item.excelUnitCost === null || item.excelUnitCost === undefined || item.excelUnitCost === ""
              ? null
              : Number(item.excelUnitCost),
            pricingMethod: toText(item.pricingMethod) || "by_weight",
          };

          const createdMaterial = await tx.erpMaterial.create({ data: createData as any });
          await tx.erpInventoryTransaction.create({
              data: {
                materialId: createdMaterial.id,
                type: TransactionType.ADJUST,
                quantity: Number(item.excelRemaining) || 0,
                beforeQty: 0,
                afterQty: Number(item.excelRemaining) || 0,
                relatedDoc: "Excel导入新增",
                remark: item.remark || `Excel导入新增：库存 0 → ${Number(item.excelRemaining) || 0}`,
              },
            });

          results.created++;
          results.matched++;
          continue;
        }

        if (item.action === "unmatched") {
          results.unmatched++;
          continue;
        }

        if (item.action !== "update" || !item.matchedId) continue;

        const material = await tx.erpMaterial.findUnique({ where: { id: item.matchedId }, select: { remaining: true } });
        if (!material) {
          results.errors.push(`材料 ID ${item.matchedId} 不存在`);
          continue;
        }

        const beforeQty = material.remaining;
        const afterQty = Number(item.excelRemaining) || 0;
        const quantityDiff = afterQty - beforeQty;
        const updateData: Record<string, unknown> = { remaining: afterQty };

        if (item.excelUnitCost !== null && item.excelUnitCost !== undefined && item.excelUnitCost !== "") {
          updateData.unitCost = Number(item.excelUnitCost);
        }

        await tx.erpMaterial.update({ where: { id: item.matchedId }, data: updateData });
        await tx.erpInventoryTransaction.create({
          data: {
            materialId: item.matchedId,
            type: TransactionType.ADJUST,
            quantity: quantityDiff,
            beforeQty,
            afterQty,
            relatedDoc: "Excel导入调整",
            remark: item.remark || `Excel导入调整：库存 ${beforeQty} → ${afterQty}`,
          },
        });

        results.updated++;
        results.matched++;
      }
    });

    return NextResponse.json({ ok: true, results });
  } catch (error: any) {
    console.error("Import apply error:", error);
    return NextResponse.json(
      { ok: false, error: "导入失败", detail: error?.message || String(error) },
      { status: 500 }
    );
  }
}
