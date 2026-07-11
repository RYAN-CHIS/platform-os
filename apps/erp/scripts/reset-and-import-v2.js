const XLSX = require('xlsx');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  // 创建数据库连接
  const client = new Client({
    connectionString: "postgresql://neondb_owner:npg_cAas8kuHmrO0@ep-polished-unit-ajk5rq34.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require"
  });
  
  try {
    await client.connect();
    console.log('=== 数据库连接成功 ===\n');
    
    // 步骤1：备份现有数据
    console.log('=== 步骤1：备份现有数据 ===');
    const backupResult = await client.query('SELECT * FROM raw_materials');
    const backupPath = path.join(__dirname, 'backup-' + Date.now() + '.json');
    fs.writeFileSync(backupPath, JSON.stringify(backupResult.rows, null, 2));
    console.log(`✓ 已备份 ${backupResult.rows.length} 条材料数据到：`);
    console.log(`  ${backupPath}\n`);
    
    // 步骤2：清空现有数据
    console.log('=== 步骤2：清空现有数据 ===');
    
    // 先删除所有引用raw_materials的表（处理外键约束）
    const tablesToClear = [
      'bom',
      'inventory_transactions', 
      'purchase_records',
      'work_materials',
      'product_materials'
    ];
    
    for (const table of tablesToClear) {
      try {
        const result = await client.query(`DELETE FROM "${table}"`);
        console.log(`✓ 已删除 ${result.rowCount} 条 ${table} 记录`);
      } catch (error) {
        // 表可能不存在，忽略错误
        console.log(`  表 ${table} 不存在或已清空`);
      }
    }
    
    // 清空材料表
    const deletedMaterials = await client.query('DELETE FROM raw_materials');
    console.log(`✓ 已删除 ${deletedMaterials.rowCount} 条材料记录\n`);
    
    // 步骤3：读取Excel文件
    console.log('=== 步骤3：读取Excel进货清单 ===\n');
    const workbook = XLSX.readFile('/Users/ryan/Desktop/允物/进货清单.xlsx');
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // 解析数据（从第5行开始）
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
        const specification = record.规格mm ? parseFloat(record.规格mm).toString() : null;
        
        // 插入材料（使用正确的列名）
        const insertResult = await client.query(`
          INSERT INTO raw_materials 
          (code, name, category, supplier, specification, shape, remark, remaining, "unitCost", created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          RETURNING id
        `, [
          record.原料编码,
          record.名称,
          record.品类,
          record.供应商 || null,
          specification,
          record.形状 || null,
          record.备注 || null,
          remaining,
          unitCost
        ]);
        
        const newMaterialId = insertResult.rows[0].id;
        
        // 创建库存变动记录
        await client.query(`
          INSERT INTO inventory_transactions
          (material_id, type, quantity, before_qty, after_qty, related_doc, remark, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
          newMaterialId,
          'IN',
          remaining,
          0,
          remaining,
          '进货清单导入',
          `初始入库: ${record.采购总价}元, 编码: ${record.原料编码}`
        ]);
        
        successCount++;
        console.log(`✓ [${successCount}/${records.length}] ${record.原料编码} - ${record.名称} (库存: ${remaining})`);
        
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
    const totalMaterials = await client.query('SELECT COUNT(*) FROM raw_materials');
    const totalTransactions = await client.query('SELECT COUNT(*) FROM inventory_transactions');
    
    console.log('=== 验证 ===');
    console.log(`材料总数: ${totalMaterials.rows[0].count}`);
    console.log(`库存变动记录总数: ${totalTransactions.rows[0].count}`);
    
  } catch (error) {
    console.error('\n错误:', error.message);
    console.error(error.stack);
  } finally {
    await client.end();
    console.log('\n数据库连接已关闭');
  }
}

main();
