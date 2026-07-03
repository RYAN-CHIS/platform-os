import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@yunwu/db";
import * as XLSX from "xlsx";

const COLUMN_ALIASES: Record<string, string> = {
  "编码": "code",
  code: "code",
  material_code: "code",
  "材料编码": "code",
  "名称": "name",
  name: "name",
  material_name: "name",
  "材料名称": "name",
  "库存": "remaining",
  remaining: "remaining",
  stock: "remaining",
  quantity: "remaining",
  "数量": "remaining",
  "最小单位单价": "unitCost",
  unit_cost: "unitCost",
  price: "unitCost",
  "单价": "unitCost",
  "备注": "remark",
  remark: "remark",
};

const TransactionType = {
  ADJUST: "ADJUST",
} as const;

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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请上传文件" }, { status: 400 });
    }

    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith(".xlsx")) {
      return NextResponse.json({ error: "只支持 .xlsx 格式文件" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    if (rows.length === 0) {
      return NextResponse.json({ error: "文件为空或格式不正确" }, { status: 400 });
    }

    const existingMaterials = await prisma.rawMaterial.findMany({
      select: { id: true, code: true, name: true, remaining: true, unitCost: true },
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
      const remaining = toNumber(normalized.remaining) ?? 0;
      const unitCost = toNumber(normalized.unitCost);
      const remark = normalizeCell(normalized.remark);

      let matched = null as null | { id: number; code: string; name: string; remaining: number; unitCost: number | null };
      if (code) matched = existingMaterials.find((m) => m.code === code) || null;
      if (!matched && name) matched = existingMaterials.find((m) => m.name === name) || null;

      if (!matched) {
        return {
          rowNum,
          code: code || "-",
          name: name || "-",
          excelRemaining: remaining,
          excelUnitCost: unitCost,
          currentRemaining: null,
          currentUnitCost: null,
          matched: false,
          matchedId: null,
          difference: null,
          action: "unmatched",
          remark,
        };
      }

      return {
        rowNum,
        code: matched.code,
        name: matched.name,
        excelRemaining: remaining,
        excelUnitCost: unitCost,
        currentRemaining: matched.remaining,
        currentUnitCost: matched.unitCost,
        matched: true,
        matchedId: matched.id,
        difference: remaining - matched.remaining,
        action: "update",
        remark,
      };
    });

    return NextResponse.json({ preview });
  } catch (error: any) {
    console.error("Import preview error:", error);
    return NextResponse.json({ error: `导入预览失败: ${error.message}` }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : null;

    if (!items) {
      return NextResponse.json({ error: "无效的数据格式" }, { status: 400 });
    }

    const results = { matched: 0, updated: 0, skipped: 0, unmatched: 0, errors: [] as string[] };

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        if (item.action === "skip" || item.action === "unmatched") {
          if (item.action === "unmatched") results.unmatched++;
          else results.skipped++;
          continue;
        }

        if (item.action !== "update" || !item.matchedId) continue;

        const material = await tx.rawMaterial.findUnique({ where: { id: item.matchedId } });
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

        await tx.rawMaterial.update({ where: { id: item.matchedId }, data: updateData });
        await tx.inventoryTransaction.create({
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

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Import apply error:", error);
    return NextResponse.json({ error: `导入失败: ${error.message}` }, { status: 500 });
  }
}
