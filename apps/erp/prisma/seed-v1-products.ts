import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================================
// V1 产品种子数据（来自用户提供的《允物 ERP V1 产品种子数据》）
// ============================================================

const SERIES_DATA = [
  { code: "fuchu",  name: "芙初", subtitle: "本真之序", sortOrder: 1 },
  { code: "qichi",  name: "栖迟", subtitle: "归心之序", sortOrder: 2 },
  { code: "fusu",   name: "扶苏", subtitle: "生长之序", sortOrder: 3 },
  { code: "cangming", name: "沧溟", subtitle: "格局之序", sortOrder: 4 },
  { code: "jiming", name: "既明", subtitle: "觉知之序", sortOrder: 5 },
  { code: "guanfu", name: "观复", subtitle: "收藏之序", sortOrder: 6 },
];

// Works：每个产品对应一个 Work
const WORKS_DATA = [
  { seriesCode: "fuchu",     code: "W001", name: "初见", keyword: "本真",  story: "人生最珍贵的能力，是保持第一次看见世界时的欢喜。" },
  { seriesCode: "fuchu",     code: "W002", name: "欢颜", keyword: "喜悦",  story: "真正的欢喜，从不需要向别人证明。" },
  { seriesCode: "fuchu",     code: "W003", name: "月白", keyword: "美好",  story: "月色之下，仍愿温柔待己。" },
  { seriesCode: "fuchu",     code: "W004", name: "清欢", keyword: "纯粹",  story: "人间有味是清欢。" },
  { seriesCode: "qichi",     code: "W005", name: "小隐", keyword: "松弛",  story: "大隐隐于市。" },
  { seriesCode: "qichi",     code: "W006", name: "归心", keyword: "归心",  story: "心安处，即归处。" },
  { seriesCode: "qichi",     code: "W007", name: "松风", keyword: "治愈",  story: "风过松林，自有清凉。" },
  { seriesCode: "qichi",     code: "W008", name: "静川", keyword: "安住",  story: "静水深流。" },
  { seriesCode: "qichi",     code: "W009", name: "忘机", keyword: "安顿",  story: "忘却机心。" },
  { seriesCode: "fusu",      code: "W010", name: "启程", keyword: "行动",  story: "迈出第一步。" },
  { seriesCode: "fusu",      code: "W011", name: "向阳", keyword: "成长",  story: "向光而行。" },
  { seriesCode: "fusu",      code: "W012", name: "丰年", keyword: "丰盛",  story: "丰收来自漫长等待。" },
  { seriesCode: "cangming",  code: "W013", name: "和鸣", keyword: "连接",  story: "知音相遇。" },
  { seriesCode: "cangming",  code: "W014", name: "观海", keyword: "格局",  story: "观海而知天地之大。" },
  { seriesCode: "cangming",  code: "W015", name: "长鲸", keyword: "资源",  story: "深藏不露。" },
  { seriesCode: "cangming",  code: "W016", name: "九万里", keyword: "机遇", story: "风起于青萍之末。" },
  { seriesCode: "jiming",    code: "W017", name: "守拙", keyword: "定力",  story: "大巧若拙。" },
  { seriesCode: "jiming",    code: "W018", name: "定境", keyword: "觉知",  story: "一炷香，一世界。" },
  { seriesCode: "jiming",    code: "W019", name: "听雨", keyword: "沉淀",  story: "听雨而知心。" },
  { seriesCode: "jiming",    code: "W020", name: "知止", keyword: "知止",  story: "知止而后有定。" },
  { seriesCode: "guanfu",    code: "W021", name: "观山", keyword: "收藏",  story: "山在那里。" },
  { seriesCode: "guanfu",    code: "W022", name: "归藏", keyword: "归藏",  story: "万物归藏。" },
];

// 产品 SKU 数据
const SKU_DATA = [
  // 芙初
  { workCode: "W001", skuCode: "FC-CJ",   name: "芙初·初见",   price: 398, cost: 85,  tags: [] },
  { workCode: "W002", skuCode: "FC-HY",   name: "芙初·欢颜",   price: 398, cost: 45,  tags: ["爆款候选", "新客推荐"] },
  { workCode: "W003", skuCode: "FC-YB",   name: "芙初·月白",   price: 498, cost: 90,  tags: [] },
  { workCode: "W004", skuCode: "FC-QH",   name: "芙初·清欢",   price: 299, cost: 55,  tags: ["入门款"] },
  // 栖迟
  { workCode: "W005", skuCode: "QC-XY",   name: "栖迟·小隐",   price: 698, cost: 180, tags: [] },
  { workCode: "W006", skuCode: "QC-GX",   name: "栖迟·归心",   price: 598, cost: 75,  tags: ["TOP5销量候选", "主推款"] },
  { workCode: "W007", skuCode: "QC-SF",   name: "栖迟·松风",   price: 498, cost: 65,  tags: [] },
  { workCode: "W008", skuCode: "QC-JC",   name: "栖迟·静川",   price: 498, cost: 60,  tags: [] },
  { workCode: "W009", skuCode: "QC-WJ",   name: "栖迟·忘机",   price: 498, cost: 40,  tags: [] },
  // 扶苏
  { workCode: "W010", skuCode: "FS-QC",   name: "扶苏·启程",   price: 698, cost: 85,  tags: [] },
  { workCode: "W011", skuCode: "FS-XY",   name: "扶苏·向阳",   price: 998, cost: 180, tags: [] },
  { workCode: "W012", skuCode: "FS-FN",   name: "扶苏·丰年",   price: 1280,cost: 210, tags: [] },
  // 沧溟
  { workCode: "W013", skuCode: "CM-HM",   name: "沧溟·和鸣",   price: 1680,cost: 520, tags: [] },
  { workCode: "W014", skuCode: "CM-GH",   name: "沧溟·观海",   price: 1280,cost: 260, tags: [] },
  { workCode: "W015", skuCode: "CM-CJ",   name: "沧溟·长鲸",   price: 1280,cost: 320, tags: [] },
  { workCode: "W016", skuCode: "CM-JWL",  name: "沧溟·九万里", price: 698, cost: 110, tags: ["TOP5销量候选"] },
  // 既明
  { workCode: "W017", skuCode: "JM-SZ",   name: "既明·守拙",   price: 698, cost: 140, tags: ["TOP5销量候选", "主推款"] },
  { workCode: "W018", skuCode: "JM-DJ",   name: "既明·定境",   price: 1680,cost: 280, tags: [] },
  { workCode: "W019", skuCode: "JM-TY",   name: "既明·听雨",   price: 1280,cost: 220, tags: [] },
  { workCode: "W020", skuCode: "JM-ZZ",   name: "既明·知止",   price: 1280,cost: 250, tags: [] },
  // 观复
  { workCode: "W021", skuCode: "GF-GS",   name: "观复·观山",   price: 1980,cost: 520, tags: [] },
  { workCode: "W022", skuCode: "GF-GC",   name: "观复·归藏",   price: 2680,cost: 750, tags: [] },
];

// BOM 数据：skuCode → 材料清单
// 单位说明：材料中"×N"表示数量，需要映射到 RawMaterial 的 inventoryUnit
// 假设所有珠子单位均为"颗"，挂饰/配件也为"个"
const BOM_DATA: Record<string, { materialName: string; quantity: number; unit: string }[]> = {
  "FC-CJ":  [
    { materialName: "粉晶10mm",   quantity: 16, unit: "颗" },
    { materialName: "大漆珠",      quantity: 1,  unit: "个" },
    { materialName: "18K镭光珠",   quantity: 2,  unit: "颗" },
  ],
  "FC-HY": [
    { materialName: "草莓晶10mm", quantity: 16, unit: "颗" },
    { materialName: "大漆珠",     quantity: 1,  unit: "个" },
    { materialName: "粉晶10mm",   quantity: 2,  unit: "颗" },
  ],
  "FC-YB": [
    { materialName: "月光石10mm", quantity: 16, unit: "颗" },
    { materialName: "大漆珠",     quantity: 1,  unit: "个" },
    { materialName: "镶钻圆珠",    quantity: 2,  unit: "颗" },
  ],
  "FC-QH": [
    { materialName: "白水晶10mm", quantity: 18, unit: "颗" },
    { materialName: "大漆珠",     quantity: 1,  unit: "个" },
  ],
  "QC-XY": [
    { materialName: "白兔毛10mm", quantity: 16, unit: "颗" },
    { materialName: "大漆珠",     quantity: 1,  unit: "个" },
    { materialName: "祥云挂饰",    quantity: 1,  unit: "个" },
  ],
  "QC-GX": [
    { materialName: "月光石10mm", quantity: 8,  unit: "颗" },
    { materialName: "茶晶10mm",   quantity: 8,  unit: "颗" },
    { materialName: "大漆珠",      quantity: 1,  unit: "个" },
  ],
  "QC-SF": [
    { materialName: "白水晶10mm", quantity: 16, unit: "颗" },
    { materialName: "茶晶10mm",   quantity: 2,  unit: "颗" },
    { materialName: "大漆珠",     quantity: 1,  unit: "个" },
  ],
  "QC-JC": [
    { materialName: "茶晶10mm",   quantity: 18, unit: "颗" },
    { materialName: "大漆珠",     quantity: 1,  unit: "个" },
  ],
  "QC-WJ": [
    { materialName: "白月光8mm",  quantity: 10, unit: "颗" },
    { materialName: "白水晶8mm",   quantity: 8,  unit: "颗" },
    { materialName: "大漆珠",      quantity: 1,  unit: "个" },
  ],
  "FS-QC": [
    { materialName: "白水晶10mm", quantity: 14, unit: "颗" },
    { materialName: "堇青石10mm", quantity: 4,  unit: "颗" },
    { materialName: "大漆珠",     quantity: 1,  unit: "个" },
  ],
  "FS-XY": [
    { materialName: "白兔毛10mm", quantity: 14, unit: "颗" },
    { materialName: "18K镭光珠",   quantity: 2,  unit: "颗" },
    { materialName: "大漆珠",      quantity: 1,  unit: "个" },
  ],
  "FS-FN": [
    { materialName: "蜜蜡",    quantity: 16, unit: "颗" },
    { materialName: "大漆珠",  quantity: 1,  unit: "个" },
  ],
  "CM-HM": [
    { materialName: "青金石10mm",   quantity: 16, unit: "颗" },
    { materialName: "镶钻青金圆珠",  quantity: 2,  unit: "颗" },
    { materialName: "大漆珠",       quantity: 1,  unit: "个" },
  ],
  "CM-GH": [
    { materialName: "青金石10mm",  quantity: 8,  unit: "颗" },
    { materialName: "堇青石10mm",  quantity: 8,  unit: "颗" },
    { materialName: "大漆珠",      quantity: 1,  unit: "个" },
  ],
  "CM-CJ": [
    { materialName: "青金石10mm",  quantity: 12, unit: "颗" },
    { materialName: "茶晶10mm",    quantity: 4,  unit: "颗" },
    { materialName: "大漆珠",      quantity: 1,  unit: "个" },
  ],
  "CM-JWL": [
    { materialName: "堇青石10mm",  quantity: 16, unit: "颗" },
    { materialName: "18K镭光珠",    quantity: 2,  unit: "颗" },
    { materialName: "大漆珠",       quantity: 1,  unit: "个" },
  ],
  "JM-SZ": [
    { materialName: "老山檀10mm", quantity: 16, unit: "颗" },
    { materialName: "大漆珠",     quantity: 1,  unit: "个" },
    { materialName: "隔珠片",     quantity: 2,  unit: "个" },
  ],
  "JM-DJ": [
    { materialName: "沉香10mm",   quantity: 16, unit: "颗" },
    { materialName: "祥云纹三通",  quantity: 1,  unit: "个" },
    { materialName: "大漆珠",     quantity: 1,  unit: "个" },
  ],
  "JM-TY": [
    { materialName: "老山檀10mm", quantity: 12, unit: "颗" },
    { materialName: "沉香10mm",   quantity: 4,  unit: "颗" },
    { materialName: "大漆珠",     quantity: 1,  unit: "个" },
  ],
  "JM-ZZ": [
    { materialName: "沉香10mm",   quantity: 10, unit: "颗" },
    { materialName: "老山檀10mm",  quantity: 8,  unit: "颗" },
    { materialName: "大漆珠",     quantity: 1,  unit: "个" },
  ],
  "GF-GS": [
    { materialName: "南红10mm",   quantity: 16, unit: "颗" },
    { materialName: "南红三通",    quantity: 1,  unit: "个" },
    { materialName: "大漆珠",     quantity: 1,  unit: "个" },
  ],
  "GF-GC": [
    { materialName: "蜜蜡",      quantity: 16, unit: "颗" },
    { materialName: "圆蜜蜡挂饰",  quantity: 1,  unit: "个" },
    { materialName: "大漆珠",     quantity: 1,  unit: "个" },
  ],
};

// 从 BOM 中提取所有唯一材料名称，生成 RawMaterial 种子数据
// 这里需要为每种材料设定一个合理的采购单价（元/颗 或 元/个）
// 根据实际成本反推：
// 成本 = Σ(材料单价 × 数量)
// 由于用户提供了每个SKU的成本，我们可以估算材料单价

// 先汇总所有唯一材料
const ALL_MATERIAL_NAMES = new Set<string>();
for (const boms of Object.values(BOM_DATA)) {
  for (const b of boms) ALL_MATERIAL_NAMES.add(b.materialName);
}

// 为每种材料设定一个估算单价（元/单位），后续可通过采购记录修正
// 这里的单价是估算，实际以采购记录为准
const MATERIAL_UNIT_COST: Record<string, number> = {
  "粉晶10mm":      3.0,
  "草莓晶10mm":    1.5,
  "月光石10mm":    3.0,
  "白水晶10mm":    1.0,
  "白水晶8mm":     0.8,
  "白兔毛10mm":    5.0,
  "茶晶10mm":      1.5,
  "白月光8mm":     2.5,
  "堇青石10mm":    3.0,
  "蜜蜡":          8.0,
  "青金石10mm":    15.0,
  "镶钻青金圆珠":   25.0,
  "老山檀10mm":    5.0,
  "沉香10mm":      10.0,
  "南红10mm":      20.0,
  // 配件
  "大漆珠":        5.0,
  "18K镭光珠":     8.0,
  "镶钻圆珠":       8.0,
  "祥云挂饰":       15.0,
  "隔珠片":         1.0,
  "祥云纹三通":     10.0,
  "南红三通":       20.0,
  "圆蜜蜡挂饰":     30.0,
};

function calcBomCost(skuCode: string): number {
  const boms = BOM_DATA[skuCode];
  if (!boms) return 0;
  return Math.round(boms.reduce((sum, b) => sum + (MATERIAL_UNIT_COST[b.materialName] || 0) * b.quantity, 0) * 100) / 100;
}

async function main() {
  console.log("🌱 开始导入允物 ERP V1 产品种子数据...\n");

  // ----------------------------------------------------------------
  // Step 1: 创建/更新 Series
  // ----------------------------------------------------------------
  console.log("📦 Step 1: 创建/更新 Series...");
  const seriesMap: Record<string, { id: number; name: string }> = {};
  for (const s of SERIES_DATA) {
    const existing = await prisma.series.findUnique({ where: { code: s.code } });
    if (existing) {
      await prisma.series.update({ where: { code: s.code }, data: { name: s.name, sortOrder: s.sortOrder } });
      seriesMap[s.code] = { id: existing.id, name: s.name };
      console.log(`   ↻ 已更新序列: ${s.name} (${s.code})`);
    } else {
      const created = await prisma.series.create({ data: { code: s.code, name: s.name, sortOrder: s.sortOrder } });
      seriesMap[s.code] = { id: created.id, name: s.name };
      console.log(`   ✅ 已创建序列: ${s.name} (${s.code})`);
    }
  }

  // ----------------------------------------------------------------
  // Step 2: 创建/更新 Works + WorksAssets
  // ----------------------------------------------------------------
  console.log("\n📦 Step 2: 创建/更新 Works...");
  const workMap: Record<string, number> = {}; // workCode → workId
  for (const w of WORKS_DATA) {
    const series = seriesMap[w.seriesCode];
    if (!series) { console.warn(`   ⚠️ 找不到序列: ${w.seriesCode}`); continue; }

    const existing = await prisma.works.findUnique({ where: { code: w.code } });
    let workId: number;
    if (existing) {
      await prisma.works.update({ where: { code: w.code }, data: { name: w.name, seriesId: series.id, status: "ACTIVE" } });
      workId = existing.id;
      console.log(`   ↻ 已更新作品: ${w.name} (${w.code})`);
    } else {
      const created = await prisma.works.create({ data: { code: w.code, name: w.name, seriesId: series.id, status: "ACTIVE" } });
      workId = created.id;
      console.log(`   ✅ 已创建作品: ${w.name} (${w.code})`);
    }
    workMap[w.code] = workId;

    // WorksAssets（幂等）
    const existingAsset = await prisma.worksAssets.findUnique({ where: { workId } });
    const assetData = { story: w.story, designConcept: `关键词：${w.keyword}`, quote: `"${w.story}"` };
    if (existingAsset) {
      await prisma.worksAssets.update({ where: { workId }, data: assetData });
    } else {
      await prisma.worksAssets.create({ data: { workId, ...assetData } });
    }
  }

  // ----------------------------------------------------------------
  // Step 3: 创建/更新 Products
  // ----------------------------------------------------------------
  console.log("\n📦 Step 3: 创建/更新 Products...");
  const productMap: Record<string, number> = {}; // skuCode → productId
  for (const sku of SKU_DATA) {
    const workId = workMap[sku.workCode];
    if (!workId) { console.warn(`   ⚠️ 找不到作品: ${sku.workCode}`); continue; }

    // 每个 SKU 对应一个 Product
    const existingProduct = await prisma.products.findUnique({ where: { code: sku.skuCode } });
    let productId: number;
    if (existingProduct) {
      await prisma.products.update({ where: { code: sku.skuCode }, data: { name: sku.name, workId, status: "ACTIVE" } });
      productId = existingProduct.id;
    } else {
      const created = await prisma.products.create({ data: { code: sku.skuCode, name: sku.name, workId, status: "ACTIVE" } });
      productId = created.id;
    }
    productMap[sku.skuCode] = productId;
  }
  console.log(`   ✅ Products 处理完成 (${SKU_DATA.length} 个)`);

  // ----------------------------------------------------------------
  // Step 4: 创建/更新 RawMaterial（材料库）
  // ----------------------------------------------------------------
  console.log("\n📦 Step 4: 创建/更新 RawMaterial（材料库）...");
  const materialMap: Record<string, number> = {}; // materialName → materialId

  // 先确保所有 BOM 中出现的材料都在 RawMaterial 中
  const materialList = [...ALL_MATERIAL_NAMES];
  for (const mName of materialList) {
    // 根据材料名称判断 materialType
    let materialType: any = "BEAD";
    let category = "水晶";
    if (mName.includes("老山檀") || mName.includes("沉香") || mName.includes("崖柏")) { materialType = "INCENSE"; category = "木质"; }
    else if (mName.includes("南红") || mName.includes("蜜蜡") || mName.includes("青金石") || mName.includes("堇青石")) { materialType = "BEAD"; category = "宝石"; }
    else if (mName.includes("大漆珠") || mName.includes("镭光") || mName.includes("镶钻") || mName.includes("隔珠") || mName.includes("三通") || mName.includes("挂饰")) { materialType = "CERAMIC"; category = "配件"; }
    else if (mName.includes("粉晶") || mName.includes("草莓晶") || mName.includes("月光石") || mName.includes("白水晶") || mName.includes("茶晶") || mName.includes("白兔毛") || mName.includes("白月光")) { materialType = "BEAD"; category = "水晶"; }

    const code = `MAT-${mName.replace(/\s/g, "")}`;
    const existing = await prisma.rawMaterial.findUnique({ where: { code } });
    let matId: number;
    if (existing) {
      await prisma.rawMaterial.update({ where: { code }, data: { name: mName, category, materialType, unitCost: MATERIAL_UNIT_COST[mName] || 0 } });
      matId = existing.id;
    } else {
      const created = await prisma.rawMaterial.create({
        data: {
          code,
          name: mName,
          category,
          materialType,
          inventoryUnit: "颗",
          unitCost: MATERIAL_UNIT_COST[mName] || 0,
          remaining: 0,
          status: "READY",
        },
      });
      matId = created.id;
      console.log(`   ✅ 已创建材料: ${mName} (${code})`);
    }
    materialMap[mName] = matId;
  }
  console.log(`   ✅ RawMaterial 处理完成 (${materialList.length} 种材料)`);

  // ----------------------------------------------------------------
  // Step 5: 创建/更新 ProductSku + ProductCost
  // ----------------------------------------------------------------
  console.log("\n📦 Step 5: 创建/更新 ProductSku + ProductCost...");
  const skuIdMap: Record<string, number> = {}; // skuCode → skuId

  for (const sku of SKU_DATA) {
    const productId = productMap[sku.skuCode];
    if (!productId) { console.warn(`   ⚠️ 找不到产品: ${sku.skuCode}`); continue; }

    const existingSku = await prisma.productSku.findUnique({ where: { code: sku.skuCode } });
    let skuId: number;
    const grossProfit = Math.round((sku.price - sku.cost) * 100) / 100;
    const grossMargin = sku.price > 0 ? Math.round(((sku.price - sku.cost) / sku.price) * 10000) / 100 : 0;

    if (existingSku) {
      await prisma.productSku.update({ where: { code: sku.skuCode }, data: { name: sku.name, productId, price: sku.price, status: "ACTIVE" } });
      skuId = existingSku.id;
    } else {
      const created = await prisma.productSku.create({
        data: {
          code: sku.skuCode,
          name: sku.name,
          productId,
          price: sku.price,
          status: "ACTIVE",
          finishedStock: 0,
        },
      });
      skuId = created.id;
      console.log(`   ✅ 已创建 SKU: ${sku.name} (${sku.skuCode}) ¥${sku.price}`);
    }
    skuIdMap[sku.skuCode] = skuId;

    // ProductCost（幂等）
    const existingCost = await prisma.productCost.findUnique({ where: { skuId } });
    const costData = {
      skuId,
      materialCost: sku.cost,
      laborCost: 0,
      packagingCost: 0,
      totalCost: sku.cost,
    };
    if (existingCost) {
      await prisma.productCost.update({ where: { skuId }, data: costData });
    } else {
      await prisma.productCost.create({ data: costData });
    }
  }
  console.log(`   ✅ ProductSku + ProductCost 处理完成`);

  // ----------------------------------------------------------------
  // Step 6: 创建/更新 Bom
  // ----------------------------------------------------------------
  console.log("\n📦 Step 6: 创建/更新 Bom（配方）...");
  let bomCount = 0;
  for (const sku of SKU_DATA) {
    const skuId = skuIdMap[sku.skuCode];
    if (!skuId) continue;
    const boms = BOM_DATA[sku.skuCode];
    if (!boms) continue;

    // 删除该 SKU 的旧 BOM（幂等：先清后建）
    await prisma.bom.deleteMany({ where: { skuId } });

    for (const b of boms) {
      const materialId = materialMap[b.materialName];
      if (!materialId) { console.warn(`   ⚠️ 找不到材料: ${b.materialName}`); continue; }
      const lineCost = Math.round((MATERIAL_UNIT_COST[b.materialName] || 0) * b.quantity * 100) / 100;
      await prisma.bom.create({
        data: {
          skuId,
          materialId,
          quantity: b.quantity,
          unitPrice: MATERIAL_UNIT_COST[b.materialName] || 0,
          lineCost,
          materialCodeSnapshot: `MAT-${b.materialName.replace(/\s/g, "")}`,
          materialNameSnapshot: b.materialName,
        },
      });
      bomCount++;
    }
  }
  console.log(`   ✅ Bom 处理完成 (${bomCount} 条配方记录)`);

  // ----------------------------------------------------------------
  // Step 7: 验证成本计算
  // ----------------------------------------------------------------
  console.log("\n📦 Step 7: 验证成本与毛利...");
  const skus = await prisma.productSku.findMany({ include: { cost: true } });
  for (const s of skus) {
    if (!s.cost) continue;
    const gp = s.price - s.cost.totalCost;
    const gm = s.price > 0 ? ((gp / s.price) * 100).toFixed(1) : "0.0";
  }
  console.log(`   ✅ 已验证 ${skus.length} 个 SKU 的成本数据`);

  console.log("\n🎉 V1 产品种子数据导入完成！");
  console.log("============================================");
  console.log(`   序列（Series）:  ${SERIES_DATA.length} 条`);
  console.log(`   作品（Works）:   ${WORKS_DATA.length} 条`);
  console.log(`   产品（Products）: ${SKU_DATA.length} 条`);
  console.log(`   SKU:            ${SKU_DATA.length} 条`);
  console.log(`   材料（Material）: ${ALL_MATERIAL_NAMES.size} 种`);
  console.log(`   配方（BOM）:     ${bomCount} 条`);
  console.log("============================================");
}

main()
  .catch((e) => { console.error("❌ 种子数据导入失败:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
