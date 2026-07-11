const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function main() {
  // 设置数据库连接
  process.env.DATABASE_URL = "postgresql://neondb_owner:npg_cAas8kuHmrO0@ep-polished-unit-ajk5rq34.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require";
  
  const prisma = new PrismaClient();
  
  try {
    console.log('=== 步骤1：备份现有数据 ===\n');
    
    // 备份现有材料数据
    const existingMaterials = await prisma.rawMaterial.findMany();
    const backupData = JSON.stringify(existingMaterials, null, 2);
    const backupPath = path.join(__dirname, 'backup-' + Date.now() + '.json');
    fs.writeFileSync(backupPath, backupData);
    console.log(`✓ 已备份 ${existingMaterials.length} 条材料数据到：`);
    console.log(`  ${backupPath}\n`);
    
    console.log('=== 步骤2：清空现有材料数据 ===\n');
    
    // 先删除相关的库存变动记录（保持数据完整性）
    const deletedTransactions = await prisma.inventoryTransaction.deleteMany({});
    console.log(`✓ 已删除 ${deletedTransactions.count} 条库存变动记录`);
    
    // 清空材料表
    const deletedMaterials = await prisma.rawMaterial.deleteMany({});
    console.log(`✓ 已删除 ${deletedMaterials.count} 条材料记录\n`);
    
    console.log('=== 步骤3：读取Excel进货清单 ===\n');
    
    // 读取Excel文件
    const workbook = XLSX.readFile('/Users/ryan/Desktop/允物/进货清单.xlsx');
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // 解析数据（从第5行开始，索引4）
    const records = [];
    for(let i = 4; i < data.length; i++) {
      const row = data[i];
      if(!row || !row[0]) continue;
      
      records.push({
        原料编码: row[0],
        品类: row[1],
        名称: row[2],
        供应商: row[3],
        规格mm: row[4],
        形状: row[5],
        备注: row[6],
        计价方式: row[7],
        进货串数: row[8],
        计价单价: row[9],
        计价单位: row[10],
        采购总价: row[11],
        每串颗数: row[12],
        每串克重: row[13],
        总颗数: row[14],
        总克重: row[15]
      });
    }
    
    console.log(`共解析 ${records.length} 条采购记录\n`);
    
    console.log('=== 步骤4：录入新材料 ===\n');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const record of records) {
      try {
        // 计算库存数量
        const remaining = parseFloat(record.总克重) || parseFloat(record.总颗数) || 0;
        const unitCost = parseFloat(record.计价单价) || null;
        
        // 创建材料
        const newMaterial = await prisma.rawMaterial.create({
          data: {
            code: record.原料编码,
            name: record.名称,
            category: record.品类,
            supplier: record.供应商 || null,
            specMm: record.规格mm ? parseFloat(record.规格mm) : null,
            shape: record.形状 || null,
            notes: record.备注 || null,
            remaining: remaining,
            unitCost: unitCost,
            unit: record.计价单位 || null,
            lowStockAlert: 5
          }
        });
        
        // 创建库存变动记录
        await prisma.inventoryTransaction.create({
          data: {
            materialId: newMaterial.id,
            type: 'IN',
            quantity: remaining,
            beforeQty: 0,
            afterQty: remaining,
            relatedDoc: '进货清单导入',
            remark: `初始入库: ${record.采购总价}元, 编码: ${record.原料编码}`
          }
        });
        
        successCount++;
        console.log(`✓ [${successCount}/${records.length}] ${newMaterial.code} - ${newMaterial.name} (库存: ${remaining})`);
        
      } catch (error) {
        failCount++;
        console.error(`✗ [失败 ${failCount}] ${record.原料编码}:`, error.message);
      }
    }
    
    console.log(`\n=== 录入完成 ===`);
    console.log(`✓ 成功: ${successCount} 条`);
    console.log(`✗ 失败: ${failCount} 条`);
    console.log(`✓ 创建库存变动记录: ${successCount} 条\n`);
    
    // 验证数据
    const totalMaterials = await prisma.rawMaterial.count();
    const totalTransactions = await prisma.inventoryTransaction.count();
    
    console.log('=== 验证 ===');
    console.log(`材料总数: ${totalMaterials}`);
    console.log(`库存变动记录总数: ${totalTransactions}`);
    
  } catch (error) {
    console.error('\n错误:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
    console.log('\n数据库连接已关闭');
  }
}

main();
