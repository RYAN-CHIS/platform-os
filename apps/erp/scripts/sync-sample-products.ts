/**
 * 首批10款打样产品录入脚本
 * 根据用户提供的新产品清单，创建产品+SKU+BOM+成本
 */

import { PrismaClient, LifecycleStatus, MaterialType } from '@prisma/client';
import prisma from '@/lib/prisma';

const p = new PrismaClient();

// 首批10款产品定义
const PRODUCTS = [
  {
    workName: '初见',
    workCode: 'W001',
    productName: '初见',
    skuName: '初见·粉水晶10mm',
    specification: '粉水晶10mm×16 + 大漆珠×1 + 18K镭光珠×2',
    price: 198,
    size: '10mm',
    bom: [
      { materialName: '粉水晶10mm', qty: 16 },
      { materialName: '大漆珠', qty: 1 },
      { materialName: '18K镭光珠', qty: 2 },
    ],
  },
  {
    workName: '欢颜',
    workCode: 'W002',
    productName: '欢颜',
    skuName: '欢颜·草莓晶10mm',
    specification: '草莓晶10mm×15 + 粉水晶10mm×2 + 大漆珠×1',
    price: 198,
    size: '10mm',
    bom: [
      { materialName: '草莓晶10mm', qty: 15 },
      { materialName: '粉水晶10mm', qty: 2 },
      { materialName: '大漆珠', qty: 1 },
    ],
  },
  {
    workName: '月白',
    workCode: 'W003',
    productName: '月白',
    skuName: '月白·白月光10mm',
    specification: '白月光10mm×16 + 大漆珠×1 + 镶钻圆珠×2',
    price: 268,
    size: '10mm',
    bom: [
      { materialName: '白月光10mm', qty: 16 },
      { materialName: '大漆珠', qty: 1 },
      { materialName: '镶钻圆珠', qty: 2 },
    ],
  },
  {
    workName: '静川',
    workCode: 'W009',
    productName: '静川',
    skuName: '静川·茶晶10mm',
    specification: '茶晶10mm×16 + 大漆珠×1 + 隔珠片×2',
    price: 198,
    size: '10mm',
    bom: [
      { materialName: '茶晶10mm', qty: 16 },
      { materialName: '大漆珠', qty: 1 },
      { materialName: '隔珠片', qty: 2 },
    ],
  },
  {
    workName: '归心',
    workCode: 'W007',
    productName: '归心',
    skuName: '归心·白月光+茶晶10mm',
    specification: '白月光10mm×8 + 茶晶10mm×8 + 大漆珠×1',
    price: 268,
    size: '10mm',
    bom: [
      { materialName: '白月光10mm', qty: 8 },
      { materialName: '茶晶10mm', qty: 8 },
      { materialName: '大漆珠', qty: 1 },
    ],
  },
  {
    workName: '守拙',
    workCode: 'W021',
    productName: '守拙',
    skuName: '守拙·老山檀10mm',
    specification: '老山檀10mm×16 + 大漆珠×1 + 隔珠片×2',
    price: 268,
    size: '10mm',
    bom: [
      { materialName: '老山檀10mm', qty: 16 },
      { materialName: '大漆珠', qty: 1 },
      { materialName: '隔珠片', qty: 2 },
    ],
  },
  {
    workName: '定境',
    workCode: 'W022',
    productName: '定境',
    skuName: '定境·沉香10mm',
    specification: '沉香10mm×16 + 大漆珠×1 + 祥云纹三通×1',
    price: 399,
    size: '10mm',
    bom: [
      { materialName: '沉香10mm', qty: 16 },
      { materialName: '大漆珠', qty: 1 },
      { materialName: '祥云纹三通', qty: 1 },
    ],
  },
  {
    workName: '和鸣',
    workCode: 'W017',
    productName: '和鸣',
    skuName: '和鸣·青金石10mm',
    specification: '青金石10mm×16 + 镶钻青金圆珠×2 + 大漆珠×1',
    price: 399,
    size: '10mm',
    bom: [
      { materialName: '青金石10mm', qty: 16 },
      { materialName: '镶钻青金圆珠', qty: 2 },
      { materialName: '大漆珠', qty: 1 },
    ],
  },
  {
    workName: '九万里',
    workCode: 'W020',
    productName: '九万里',
    skuName: '九万里·堇青石10mm',
    specification: '堇青石10mm×16 + 18K镭光珠×2 + 大漆珠×1',
    price: 268,
    size: '10mm',
    bom: [
      { materialName: '堇青石10mm', qty: 16 },
      { materialName: '18K镭光珠', qty: 2 },
      { materialName: '大漆珠', qty: 1 },
    ],
  },
  {
    workName: '观山',
    workCode: 'W028',
    productName: '观山',
    skuName: '观山·南红10mm',
    specification: '南红10mm×16 + 南红三通×1 + 大漆珠×1',
    price: 598,
    size: '10mm',
    bom: [
      { materialName: '南红10mm', qty: 16 },
      { materialName: '南红三通', qty: 1 },
      { materialName: '大漆珠', qty: 1 },
    ],
  },
  {
    workName: '归藏',
    workCode: 'W029',
    productName: '归藏',
    skuName: '归藏·蜜蜡',
    specification: '蜜蜡×16 + 圆蜜蜡挂饰×1 + 大漆珠×1',
    price: 699,
    size: '10mm',
    bom: [
      { materialName: '蜜蜡', qty: 16 },
      { materialName: '圆蜜蜡挂饰', qty: 1 },
      { materialName: '大漆珠', qty: 1 },
    ],
  },
];

// 材料名称映射（用于查找材料ID）
const MATERIAL_NAME_MAP: Record<string, string> = {
  '粉水晶10mm': 'fs002',  // 粉水晶10mm cost:6.75
  '草莓晶10mm': 'cm002',  // 草莓晶10mm cost:0.95
  '白月光10mm': 'yg001',  // 白月光10mm cost:2.52
  '茶晶10mm': 'cj002',    // 茶晶10mm cost:2.44
  '老山檀10mm': 'st002',  // 老山檀10mm cost:7.37
  '沉香10mm': 'cx001',    // 沉香（用cx001代替，实际应按克计算）
  '青金石10mm': 'qj001',  // 青金石（需要10mm，但只有qj001/qj002）
  '堇青石10mm': 'jq002',  // 堇青石10mm cost:6.53
  '南红10mm': 'nh001',    // 南红圆珠10 cost:26.55
  '蜜蜡': 'ml002',        // 蜜蜡（用ml002，cost:55）
  '大漆珠': 'dq001',      // 大漆珠 cost:5
  '18K镭光珠': 'pj024',  // 18K金配件（需要创建或找到）
  '镶钻圆珠': '',          // 需要创建
  '隔珠片': '',            // 需要创建
  '祥云纹三通': '',        // 需要创建
  '镶钻青金圆珠': '',      // 需要创建
  '南红三通': 'nh003',    // 南红三通 cost:9.42
  '圆蜜蜡挂饰': 'pj001',  // 圆蜜蜡挂饰 cost:21.5
};

async function main() {
  console.log('🚀 开始录入首批10款打样产品...\n');

  // 1. 创建缺失的配件材料
  console.log('📦 检查并创建缺失配件...');
  const missingMaterials = [
    { code: 'pj025', name: '18K镭光珠', cost: 8 },
    { code: 'pj026', name: '镶钻圆珠', cost: 12 },
    { code: 'pj027', name: '隔珠片', cost: 2 },
    { code: 'pj028', name: '祥云纹三通', cost: 15 },
    { code: 'pj029', name: '镶钻青金圆珠', cost: 18 },
  ];

  const materialMap: Record<string, number> = {};  // name -> id

  for (const m of missingMaterials) {
    const existing = await p.rawMaterial.findFirst({ where: { name: m.name } });
    if (existing) {
      console.log(`  ⚠️  已存在: ${m.name} (${existing.code})`);
      materialMap[m.name] = existing.id;
      continue;
    }
    const created = await p.rawMaterial.create({
      data: {
        code: m.code,
        name: m.name,
        category: '配件',
        materialType: MaterialType.ACCESSORY,
        specification: '',
        inventoryUnit: '个',
        defaultPurchaseUnit: '个',
        remaining: 100,
        unitCost: m.cost,
        supplier: '',
        remark: '打样配件',
      },
    });
    console.log(`  ✅ 创建: ${m.name} (${m.code})`);
    materialMap[m.name] = created.id;
  }

  // 2. 填充已有材料的ID到 materialMap
  const allMaterials = await p.rawMaterial.findMany({});
  for (const m of allMaterials) {
    if (!materialMap[m.name]) {
      materialMap[m.name] = m.id;
    }
  }

  console.log(`\n📊 材料映射完成，共 ${Object.keys(materialMap).length} 种材料\n`);

  // 3. 创建产品和SKU
  console.log('🎨 创建产品和SKU...');
  let skuCounter = 1;
  let productCounter = 1;

  for (const def of PRODUCTS) {
    // 查找作品
    const work = await p.works.findFirst({ where: { name: def.workName } });
    if (!work) {
      console.log(`  ❌ 作品不存在: ${def.workName}`);
      continue;
    }

    // 创建产品
    const productCode = `P${String(productCounter).padStart(3, '0')}`;
    const product = await p.products.create({
      data: {
        code: productCode,
        name: def.productName,
        workId: work.id,
        status: LifecycleStatus.ACTIVE,
        description: `${def.productName} - ${def.specification}`,
      },
    });
    console.log(`  ✅ 产品: ${product.code} ${product.name} (work: ${work.name})`);
    productCounter++;

    // 创建SKU
    const skuCode = `SKU${String(skuCounter).padStart(4, '0')}`;
    const sku = await p.productSku.create({
      data: {
        code: skuCode,
        name: def.skuName,
        productId: product.id,
        status: LifecycleStatus.ACTIVE,
        specification: def.specification,
        size: def.size,
        price: def.price,
        finishedStock: 0,
      },
    });
    console.log(`     ✅ SKU: ${sku.code} ${sku.name} ¥${sku.price}`);
    skuCounter++;

    // 4. 创建BOM和成本
    let totalMaterialCost = 0;
    for (const bomItem of def.bom) {
      const materialId = materialMap[bomItem.materialName];
      if (!materialId) {
        console.log(`    ⚠️  材料未找到: ${bomItem.materialName}`);
        continue;
      }

      const material = await p.rawMaterial.findUnique({ where: { id: materialId } });
      const itemCost = (material?.unitCost || 0) * bomItem.qty;
      totalMaterialCost += itemCost;

      await p.bom.create({
        data: {
          skuId: sku.id,
          materialId: materialId,
          quantity: bomItem.qty,
          unitCost: material?.unitCost || 0,
          totalCost: itemCost,
        },
      });
      console.log(`      📋 BOM: ${bomItem.materialName} × ${bomItem.qty} = ¥${itemCost.toFixed(2)}`);
    }

    // 5. 创建成本记录（含人工成本）
    const laborCost = Math.round(totalMaterialCost * 0.3);  // 假设人工成本为原料成本的30%
    const totalCost = totalMaterialCost + laborCost;

    await p.productCost.create({
      data: {
        skuId: sku.id,
        materialCost: totalMaterialCost,
        laborCost: laborCost,
        totalCost: totalCost,
      },
    });
    console.log(`     💰 成本: 材料¥${totalMaterialCost.toFixed(2)} + 人工¥${laborCost} = ¥${totalCost.toFixed(2)} (毛利率: ${((1 - totalCost / def.price) * 100).toFixed(1)}%)\n`);
  }

  console.log('✅ 首批10款打样产品录入完成！');
  console.log(`   产品: ${productCounter - 1} 个`);
  console.log(`   SKU: ${skuCounter - 1} 个`);
}

main()
  .catch((e) => {
    console.error('❌ 错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await p.$disconnect();
  });
