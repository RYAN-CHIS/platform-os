import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

const MATERIAL_TYPE_MAP: Record<string, any> = {
  "珠类": "BEAD",
  "水晶": "BEAD",
  "木质": "BEAD",
  "宝石": "BEAD",
  "金属": "METAL",
  "陶瓷": "CERAMIC",
  "皮革": "LEATHER",
  "沉香": "INCENSE",
  "绳线": "CORD",
  "包装": "PACKAGING",
  "其他": "OTHER",
};

function mapMaterialType(raw: string): any {
  return MATERIAL_TYPE_MAP[raw] || "OTHER";
}

/**
 * V3.1 导入 API
 * 只支持原材料导入（通过采购记录入库）
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "请上传文件" }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
    const log: string[] = [];

    // 导入原材料（01原料采购库）
    if (wb.SheetNames.includes("01原料采购库")) {
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(
        wb.Sheets["01原料采购库"]
      );
      let count = 0;
      for (const row of rows) {
        const code = String(row["原料编码"] ?? "").trim();
        if (!code) continue;

        const name = String(row["名称"] ?? "");
        const category = String(row["品类"] ?? "");
        const supplier = String(row["供应商"] ?? "");
        const specification = String(row["规格"] ?? "");
        const remark = String(row["备注"] ?? "");
        const inventoryUnitRaw = String(row["库存单位"] ?? "个");
        const mappedInventoryUnit = inventoryUnitRaw as any;

        const materialTypeRaw = String(row["材料类型"] ?? "其他");
        const mappedMaterialType = mapMaterialType(materialTypeRaw);

        // 创建或更新材料
        await prisma.rawMaterial.upsert({
          where: { code },
          update: {
            name,
            category,
            supplier,
            specification,
            remark,
            materialType: mappedMaterialType,
            inventoryUnit: mappedInventoryUnit,
          },
          create: {
            code,
            name,
            category,
            supplier,
            specification,
            remark,
            materialType: mappedMaterialType,
            inventoryUnit: mappedInventoryUnit,
            remaining: 0,
            unitCost: null,
          },
        });

        // 如果有采购信息，创建采购记录
        const purchasePrice = row["采购总价"] ? Number(row["采购总价"]) : 0;
        const purchaseQuantity = row["采购数量"] ? Number(row["采购数量"]) : 0;
        const purchaseUnit = String(row["采购单位"] ?? "个");
        const conversionRate = row["转换率"] ? Number(row["转换率"]) : 1;

        if (purchasePrice > 0 && purchaseQuantity > 0) {
          const material = await prisma.rawMaterial.findUnique({ where: { code } });
          if (material) {
            const inventoryQuantity = purchaseQuantity * conversionRate;

            await prisma.$transaction(async (tx) => {
              const purchaseRecord = await tx.purchaseRecord.create({
                data: {
                  materialId: material.id,
                  purchaseDate: new Date(),
                  supplier,
                  purchaseUnit,
                  conversionRate,
                  purchaseQuantity,
                  purchasePrice,
                  inventoryQuantity,
                  unitCost: purchasePrice / inventoryQuantity,
                },
              });

              const oldRemaining = material.remaining;
              const oldUnitCost = material.unitCost ?? 0;
              const newRemaining = oldRemaining + inventoryQuantity;
              const newUnitCost =
                oldRemaining === 0
                  ? purchasePrice / inventoryQuantity
                  : (oldRemaining * oldUnitCost + purchasePrice) / newRemaining;

              await tx.inventoryTransaction.create({
                data: {
                  materialId: material.id,
                  type: "IN",
                  quantity: inventoryQuantity,
                  beforeQty: oldRemaining,
                  afterQty: newRemaining,
                  relatedDoc: `import_purchase_${purchaseRecord.id}`,
                  remark: "Excel导入",
                },
              });

              await tx.rawMaterial.update({
                where: { id: material.id },
                data: {
                  remaining: newRemaining,
                  unitCost: newUnitCost,
                },
              });
            });
          }
        }

        count++;
      }
      log.push(`原材料：${count} 条`);
    }

    return NextResponse.json({ ok: true, log });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
