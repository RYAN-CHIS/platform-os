import { NextResponse } from "next/server";
import {
  adjustInventory,
  consumeMaterial,
  getInventoryTransactions,
} from "@/src/modules/raw-material/raw-material.service";

/**
 * 获取库存事务列表
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const materialId = searchParams.get("materialId");
  const type = searchParams.get("type");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const transactions = await getInventoryTransactions({
    materialId: materialId ? parseInt(materialId) : undefined,
    type: type || undefined,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  });

  return NextResponse.json(transactions);
}

/**
 * 库存调整（盘点调整）
 * 注意：IN 类型只能通过采购入库创建，这里只允许 OUT 和 ADJUST
 */
export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.materialId) {
      return NextResponse.json({ error: "材料ID不能为空" }, { status: 400 });
    }

    // 只允许 ADJUST 类型从 API 直接创建（OUT 应该通过生产领料触发）
    if (data.type === "IN") {
      return NextResponse.json(
        { error: "IN 类型只能通过采购入库创建，请使用 /api/purchase-records" },
        { status: 400 }
      );
    }

    if (data.type === "ADJUST") {
      // 库存调整：直接设置新的库存数量
      const newQuantity = parseFloat(data.newQuantity);
      if (isNaN(newQuantity) || newQuantity < 0) {
        return NextResponse.json(
          { error: "调整后数量必须为非负数" },
          { status: 400 }
        );
      }

      await adjustInventory({
        materialId: parseInt(data.materialId),
        newQuantity,
        remark: data.remark,
      });

      return NextResponse.json({ success: true });
    }

    if (data.type === "OUT") {
      // 库存扣减（生产领料等）
      const quantity = parseFloat(data.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        return NextResponse.json(
          { error: "扣减数量必须大于0" },
          { status: 400 }
        );
      }

      await consumeMaterial({
        materialId: parseInt(data.materialId),
        quantity,
        relatedDoc: data.relatedDoc,
        remark: data.remark,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "不支持的事务类型" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "库存操作失败" },
      { status: 500 }
    );
  }
}
