"use server";
/**
 * Dashboard KPI Actions — WO-P11B
 * 真实数据：ERP + Brand KPI + 系统状态
 * 修复 model 名称（依据 packages/db/schema.prisma）
 */
import { prisma } from "@yunwu/db";
import { brandPrisma } from "@yunwu/db/brand";

// ── ERP KPIs ───────────────────────────────────
export async function getErpKpis() {
  try {
    const [
      productCount,
      skuCount,
      materialCount,
      bomCount,
      inventoryCount,
      productionCount,
      orderCount,
      customerCount,
      purchaseCount,
    ] = await Promise.all([
      prisma.erpProduct.count().catch(() => 0),
      prisma.erpProductSku.count().catch(() => 0),
      prisma.erpMaterial.count().catch(() => 0),
      prisma.erpBom.count().catch(() => 0),
      prisma.erpInventoryTransaction.count().catch(() => 0),
      prisma.erpProductionRecord.count().catch(() => 0),
      prisma.erpOrder.count().catch(() => 0),
      prisma.erpCustomer.count().catch(() => 0),
      prisma.erpPurchaseRecord.count().catch(() => 0),
    ]);

    // 成本总额（product_costs.total_cost）
    let totalCost = 0;
    try {
      const result: any[] = await prisma.$queryRaw`
        SELECT COALESCE(SUM(total_cost), 0) as total FROM product_costs
      `;
      totalCost = Number(result[0]?.total) || 0;
    } catch {}

    // 采购总额
    let totalPurchase = 0;
    try {
      const result: any[] = await prisma.$queryRaw`
        SELECT COALESCE(SUM(total_amount), 0) as total FROM purchase_records
      `;
      totalPurchase = Number(result[0]?.total) || 0;
    } catch {}

    return {
      productCount,
      skuCount,
      materialCount,
      bomCount,
      inventoryCount,
      productionCount,
      orderCount,
      customerCount,
      purchaseCount,
      totalCost,
      totalPurchase,
      erpConnected: true,
    };
  } catch (e: any) {
    return {
      productCount: 0, skuCount: 0, materialCount: 0, bomCount: 0,
      inventoryCount: 0, productionCount: 0, orderCount: 0, customerCount: 0,
      purchaseCount: 0, totalCost: 0, totalPurchase: 0,
      erpConnected: false, erpError: e.message,
    };
  }
}

// ── Brand KPIs ─────────────────────────────────
export async function getBrandKpis() {
  try {
    const hasBrandDb = !!process.env.BRAND_DATABASE_URL;

    if (!hasBrandDb) {
      return {
        brandProductCount: 0,
        seriesCount: 0,
        journalCount: 0,
        bannerCount: 0,
        bannerTableExists: false,
        bannerError: "BRAND_DATABASE_URL 未配置",
        seoCount: 0,
        pageContentCount: 0,
        mediaCount: 0,
        publishJobCount: 0,
        versionCount: 0,
        brandConnected: false,
      };
    }

    // 检查 banners 表是否存在
    let bannerCount = 0;
    let bannerError: string | undefined;
    try {
      bannerCount = await brandPrisma.brandBanner.count();
    } catch (e: any) {
      bannerError = "banners table missing: " + e.message;
    }

    const [
      brandProductCount,
      seriesCount,
      journalCount,
      seoCount,
      pageContentCount,
      mediaCount,
      publishJobCount,
      versionCount,
    ] = await Promise.all([
      brandPrisma.brandProduct.count().catch(() => 0),
      brandPrisma.brandSeries.count().catch(() => 0),
      brandPrisma.brandJournalPost.count().catch(() => 0),
      brandPrisma.brandSeoConfig.count().catch(() => 0),
      brandPrisma.brandPageContent.count().catch(() => 0),
      brandPrisma.brandMediaAsset.count().catch(() => 0),
      prisma.publishJob.count({ where: { status: "pending" } }).catch(() => 0),
      prisma.contentVersion.count().catch(() => 0),
    ]);

    return {
      brandProductCount,
      seriesCount,
      journalCount,
      bannerCount,
      bannerTableExists: bannerError === undefined,
      bannerError,
      seoCount,
      pageContentCount,
      mediaCount,
      publishJobCount,
      versionCount,
      brandConnected: true,
    };
  } catch (e: any) {
    return {
      brandProductCount: 0,
      seriesCount: 0,
      journalCount: 0,
      bannerCount: 0,
      bannerTableExists: false,
      bannerError: e.message,
      seoCount: 0,
      pageContentCount: 0,
      mediaCount: 0,
      publishJobCount: 0,
      versionCount: 0,
      brandConnected: false,
      brandError: e.message,
    };
  }
}

// ── 系统状态 ─────────────────────────────────
export async function getSystemStatus() {
  const erpOk = !!process.env.DATABASE_URL;
  const brandOk = !!process.env.BRAND_DATABASE_URL;

  // 检查 DB 连接
  let erpConnected = erpOk;
  let brandConnected = brandOk;
  try { await prisma.$queryRaw`SELECT 1`; } catch { erpConnected = false; }
  try { await brandPrisma.$queryRaw`SELECT 1`; } catch { brandConnected = false; }

  return {
    erpConnected,
    brandConnected,
    brandDbConfigured: brandOk,
    nodeEnv: process.env.NODE_ENV || "development",
    version: "vP11B",
    timestamp: new Date().toISOString(),
  };
}
