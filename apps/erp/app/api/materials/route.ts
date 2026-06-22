import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getSessionRole, requireEditor } from "@/lib/auth";
import { canViewCost, maskMaterialForRole } from "@/lib/permissions";

/**
 * 获取原材料列表
 * 非 Admin 角色：不返回 unitCost、totalCost、purchasePrice 等成本字段
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const materialType = searchParams.get("materialType");
  const category = searchParams.get("category");
  const keyword = searchParams.get("keyword");

  const where: any = {};
  if (status) where.status = status;

  // 支持 materialType 逗号分隔多选（如 METAL,CORD）
  if (materialType) {
    const types = materialType.split(",").map((t: string) => t.trim()).filter(Boolean);
    if (types.length === 1) {
      where.materialType = types[0];
    } else if (types.length > 1) {
      where.materialType = { in: types };
    }
  }

  // 支持 category 过滤
  if (category) {
    where.category = { contains: category };
  }

  if (keyword) {
    where.OR = [
      { code: { contains: keyword } },
      { name: { contains: keyword } },
      { category: { contains: keyword } },
    ];
  }

  const list = await prisma.rawMaterial.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  // 数据脱敏：非 Admin 不可见成本
  const role = await getSessionRole();
  const masked = canViewCost(role) ? list : list.map((m) => maskMaterialForRole(m, role));

  return NextResponse.json(masked);
}

/**
 * 创建原材料
 * 支持可选首次入库：传入 initialPurchase 时自动创建采购记录和库存事务
 */
export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.code) {
      return NextResponse.json({ error: "材料编码不能为空" }, { status: 400 });
    }
    if (!data.name) {
      return NextResponse.json({ error: "材料名称不能为空" }, { status: 400 });
    }
    if (!data.inventoryUnit) {
      return NextResponse.json({ error: "库存单位不能为空" }, { status: 400 });
    }

    const initialPurchase = data.initialPurchase;
    const conversionRate = data.defaultConversionRate ?? 1;
    const purchaseQty = initialPurchase?.purchaseQuantity ?? 0;
    const purchasePrice = initialPurchase?.purchasePrice ?? 0;
    const inventoryQty = initialPurchase ? purchaseQty * conversionRate : 0;
    const calculatedUnitCost = inventoryQty > 0 && purchasePrice > 0
      ? purchasePrice / inventoryQty
      : data.unitCost ?? null;

    const material = await prisma.rawMaterial.create({
      data: {
        code: data.code,
        name: data.name,
        category: data.category ?? "",
        materialType: data.materialType ?? "BEAD",
        specification: data.specification ?? "",
        inventoryUnit: data.inventoryUnit,
        status: data.status ?? "READY",
        shape: data.shape ?? "",
        beadsPerStrand: data.beadsPerStrand ?? 0,
        weightPerStrand: data.weightPerStrand ?? 0,
        defaultPurchaseUnit: data.defaultPurchaseUnit ?? "条",
        defaultConversionRate: conversionRate,
        supplier: data.supplier ?? "",
        remark: data.remark ?? "",
        remaining: inventoryQty,
        unitCost: calculatedUnitCost,
      },
    });

    // 首次入库：创建采购记录 + 库存事务
    if (initialPurchase && purchasePrice > 0 && inventoryQty > 0) {
      const record = await prisma.purchaseRecord.create({
        data: {
          materialId: material.id,
          purchaseDate: initialPurchase.purchaseDate
            ? new Date(initialPurchase.purchaseDate)
            : new Date(),
          supplier: initialPurchase.supplier || material.supplier,
          purchaseUnit: initialPurchase.purchaseUnit || material.defaultPurchaseUnit || "条",
          conversionRate: initialPurchase.conversionRate || conversionRate,
          purchaseQuantity: purchaseQty,
          purchaseUnitPrice: purchaseQty > 0 ? purchasePrice / purchaseQty : null,
          purchasePrice: purchasePrice,
          inventoryQuantity: inventoryQty,
          unitCost: calculatedUnitCost,
          remark: "首次入库",
        },
      });

      await prisma.inventoryTransaction.create({
        data: {
          materialId: material.id,
          type: "IN",
          quantity: inventoryQty,
          beforeQty: 0,
          afterQty: inventoryQty,
          relatedDoc: `PUR-${record.id}`,
          remark: "首次采购入库",
        },
      });
    }

    return NextResponse.json(material);
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "材料编码已存在" }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || "创建材料失败" },
      { status: 500 }
    );
  }
}
