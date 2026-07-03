import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

// 允许的列名映射
const COLUMN_ALIASES: Record<string, string> = {
  "编码": "code",
  "code": "code",
  "material_code": "code",
  "材料编码": "code",
  "名称": "name",
  "name": "name",
  "material_name": "name",
  "材料名称": "name",
  "库存": "remaining",
  "remaining": "remaining",
  "stock": "remaining",
  "quantity": "remaining",
  "数量": "remaining",
  "最小单位单价": "unitCost",
  "unit_cost": "unitCost",
  "price": "unitCost",
  "单价": "unitCost",
  "备注": "remark",
  "remark": "remark",
};

// 事务类型
const TransactionType = {
  ADJUST: "ADJUST",
  PURCHASE: "PURCHASE",
  CONSUME: "CONSUME",
  RETURN: "RETURN",
  INIT: "INIT",
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "请上传文件" }, { status: 400 });
    }

    // 验证文件类型
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith(".xlsx")) {
      return NextResponse.json(
        { error: "只支持 .xlsx 格式文件" },
        { status: 400 }
      );
    }

    // 读取 Excel 文件
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "文件为空或格式不正确" },
        { status: 400 }
      );
    }

    // 获取所有现有材料（用于匹配）
    const existingMaterials = await prisma.rawMaterial.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        remaining: true,
        unitCost: true,
      },
    });

    // 解析并匹配材料
    const previewData = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as Record<string, any>;
      const rowNum = i + 2; // Excel 行号（从2开始，因为第1行是表头）

      // 标准化列名
      const normalizedRow: Record<string, any> = {};
      for (const [key, value] of Object.entries(row)) {
        const normalizedKey = COLUMN_ALIASES[key.trim()] || key.trim();
        normalizedRow[normalizedKey] = value;
      }

      const code = String(normalizedRow.code || "").trim();
      const name = String(normalizedRow.name || "").trim();
      const remaining = Number(normalizedRow.remaining) || 0;
      const unitCost = normalizedRow.unitCost ? Number(normalizedRow.unitCost) : null;
      const remark = String(normalizedRow.remark || "").trim();

      // 验证必填字段
      if (!code && !name) {
        errors.push(`第 ${rowNum} 行：缺少编码和名称，无法匹配`);
        continue;
      }

      // 匹配现有材料
      let matchedMaterial = null;
      if (code) {
        matchedMaterial = existingMaterials.find((m) => m.code === code);
      }
      if (!matchedMaterial && name) {
        matchedMaterial = existingMaterials.find((m) => m.name === name);
      }

      if (!matchedMaterial) {
        previewData.push({
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
        });
      } else {
        const difference = remaining - matchedMaterial.remaining;
        previewData.push({
          rowNum,
          code: matchedMaterial.code,
          name: matchedMaterial.name,
          excelRemaining: remaining,
          excelUnitCost: unitCost,
          currentRemaining: matchedMaterial.remaining,
          currentUnitCost: matchedMaterial.unitCost,
          matched: true,
          matchedId: matchedMaterial.id,
          difference,
          action: "update",
          remark,
        });
      }
    }

    return NextResponse.json({
      preview: previewData,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Import preview error:", error);
    return NextResponse.json(
      { error: `导入预览失败: ${error.message}` },
      { status: 500 }
    );
  }
}

// 应用导入
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "无效的数据格式" }, { status: 400 });
    }

    const results = {
      matched: 0,
      updated: 0,
      skipped: 0,
      unmatched: 0,
      errors: [] as string[],
    };

    // 使用事务确保数据一致性
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        if (item.action === "skip" || item.action === "unmatched") {
          if (item.action === "unmatched") {
            results.unmatched++;
          } else {
            results.skipped++;
          }
          continue;
        }

        if (item.action === "update" && item.matchedId) {
          const material = await tx.rawMaterial.findUnique({
            where: { id: item.matchedId },
          });

          if (!material) {
            results.errors.push(`材料 ID ${item.matchedId} 不存在`);
            continue;
          }

          const beforeQty = material.remaining;
          const afterQty = item.excelRemaining;
          const quantityDiff = afterQty - beforeQty;

          // 更新材料库存和单价
          const updateData: any = {
            remaining: afterQty,
          };

          if (item.excelUnitCost !== null && item.excelUnitCost !== undefined) {
            updateData.unitCost = item.excelUnitCost;
          }

          await tx.rawMaterial.update({
            where: { id: item.matchedId },
            data: updateData,
          });

          // 创建库存调整记录
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
      }
    });

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error("Import apply error:", error);
    return NextResponse.json(
      { error: `导入失败: ${error.message}` },
      { status: 500 }
    );
  }
}
