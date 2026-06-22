import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

/**
 * GET /api/export?type=materials|products|bom|inventory|costs|series|works|sku
 * 导出对应数据表为 Excel 文件
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "materials";

  try {
    let sheetName = "Sheet1";
    let data: Record<string, unknown>[] = [];

    switch (type) {
      case "materials": {
        sheetName = "原材料";
        const rows = await prisma.rawMaterial.findMany({ orderBy: { id: "asc" } });
        data = rows.map((r) => ({
          编码: r.code,
          名称: r.name,
          分类: r.category,
          材料类型: r.materialType,
          规格: r.specification ?? "",
          形状: r.shape ?? "",
          颗数每条: r.beadsPerStrand ?? "",
          克重每条: r.weightPerStrand ?? "",
          库存单位: r.inventoryUnit,
          库存余量: r.remaining,
          单位成本: r.unitCost ?? "",
          状态: r.status,
          供应商: r.supplier,
          备注: r.remark ?? "",
        }));
        break;
      }
      case "products": {
        sheetName = "产品";
        const rows = await prisma.products.findMany({
          orderBy: { id: "asc" },
          include: { work: { include: { series: true } }, skus: { include: { cost: true } } },
        });
        data = rows.map((r) => ({
          编码: r.code,
          名称: r.name,
          系列: r.work.series?.name ?? "",
          作品: r.work.name,
          状态: r.status,
          SKU数量: r.skus.length,
          SKU列表: r.skus.map((s) => s.name).join("、"),
          总库存: r.skus.reduce((sum, s) => sum + s.finishedStock, 0),
          描述: r.description ?? "",
        }));
        break;
      }
      case "bom": {
        sheetName = "BOM";
        const rows = await prisma.bom.findMany({
          orderBy: { id: "asc" },
          include: {
            sku: { select: { code: true, name: true, product: { select: { name: true } } } },
            material: { select: { code: true, name: true } },
          },
        });
        data = rows.map((r) => ({
          产品: r.sku.product?.name ?? "",
          SKU编码: r.sku.code,
          SKU名称: r.sku.name,
          材料编码: r.material?.code ?? "",
          材料名称: r.material?.name ?? "",
          用量: r.quantity,
          单位成本: r.unitPrice ?? "",
          行成本: r.lineCost ?? "",
        }));
        break;
      }
      case "inventory": {
        sheetName = "库存";
        const rows = await prisma.rawMaterial.findMany({
          orderBy: { id: "asc" },
        });
        data = rows.map((r) => ({
          编码: r.code,
          名称: r.name,
          材料类型: r.materialType,
          库存单位: r.inventoryUnit,
          库存余量: r.remaining,
          单位成本: r.unitCost ?? "",
          库存总值: ((r.unitCost ?? 0) * r.remaining).toFixed(2),
          状态: r.status,
        }));
        break;
      }
      case "costs": {
        sheetName = "成本利润";
        const rows = await prisma.productCost.findMany({
          orderBy: { id: "asc" },
          include: { sku: { include: { product: true } } },
        });
        data = rows.map((r) => {
          const totalCost = r.totalCost ?? 0;
          const price = r.sku.price ?? 0;
          const profit = price - totalCost;
          const margin = price > 0 ? (profit / price) * 100 : 0;
          return {
            产品: r.sku.product?.name ?? "",
            SKU编码: r.sku.code,
            SKU名称: r.sku.name,
            材料成本: r.materialCost?.toFixed(2) ?? "0",
            人工成本: r.laborCost?.toFixed(2) ?? "0",
            总成本: totalCost.toFixed(2),
            售价: price.toFixed(2),
            毛利: profit.toFixed(2),
            毛利率: margin.toFixed(1) + "%",
          };
        });
        break;
      }
      case "series": {
        sheetName = "系列";
        const rows = await prisma.series.findMany({
          orderBy: { sortOrder: "asc" },
          include: { _count: { select: { works: true } } },
        });
        data = rows.map((r) => ({
          编码: r.code,
          名称: r.name,
          排序: r.sortOrder,
          作品数: r._count.works,
        }));
        break;
      }
      case "works": {
        sheetName = "作品";
        const rows = await prisma.works.findMany({
          orderBy: { id: "asc" },
          include: { series: true, _count: { select: { products: true } } },
        });
        data = rows.map((r) => ({
          编码: r.code,
          名称: r.name,
          系列: r.series?.name ?? "",
          状态: r.status,
          产品数: r._count.products,
        }));
        break;
      }
      case "sku": {
        sheetName = "SKU";
        const rows = await prisma.productSku.findMany({
          orderBy: { id: "asc" },
          include: { product: { select: { name: true } }, cost: true },
        });
        data = rows.map((r) => ({
          产品: r.product?.name ?? "",
          编码: r.code,
          名称: r.name,
          规格: r.specification ?? "",
          尺码: r.size ?? "",
          售价: r.price?.toFixed(2) ?? "0",
          成品库存: r.finishedStock,
          材料成本: r.cost?.materialCost?.toFixed(2) ?? "0",
          人工成本: r.cost?.laborCost?.toFixed(2) ?? "0",
          总成本: r.cost?.totalCost?.toFixed(2) ?? "0",
          状态: r.status,
        }));
        break;
      }
      default:
        return NextResponse.json({ error: "未知导出类型" }, { status: 400 });
    }

    // 生成 Excel
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    const buf = Buffer.from(base64, "base64");
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${sheetName}_${dateStr}.xlsx`;
    const encoded = encodeURIComponent(filename);

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encoded}`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "导出失败" },
      { status: 500 }
    );
  }
}
