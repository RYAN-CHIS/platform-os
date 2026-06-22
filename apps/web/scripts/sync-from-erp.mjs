/**
 * 允物 ERP → 独立站 数据自动同步脚本
 *
 * 从 ERP SQLite 数据库读取作品/材料/序列表数据
 * 映射写入独立站 SQLite 数据库
 *
 * 用法: node scripts/sync-from-erp.mjs
 */

import Database from 'better-sqlite3';
import pinyinPkg from 'pinyin';
const pinyinFn = pinyinPkg.pinyin;
const STYLE_NORMAL = pinyinPkg.STYLE_NORMAL;
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// ============================================================
// 配置
// ============================================================
const ERP_DB_PATH = '/Users/ryan/WorkBuddy/2026-06-17-22-01-58/backend/prisma/dev.db';
const TARGET_DB_PATH = resolve(projectRoot, 'prisma/yunwu.db');

// ── 七序名称映射（ERP 中文名 → 独立站 slug） ──
const SEQUENCE_SLUG_MAP = {
  '芙初': 'fuchu',
  '栖迟': 'qichi',
  '扶苏': 'fusu',
  '沧溟': 'cangming',
  '既明': 'jiming',
  '观复': 'guanfu',
  '藏真': 'cangzhen',
};

// ── 七序 heroText ──
const SEQUENCE_HERO = {
  '芙初': '如芙之初，见物之本',
  '栖迟': '栖于物，迟于心',
  '扶苏': '扶摇而上，苏生万物',
  '沧溟': '心如沧海，物纳乾坤',
  '既明': '既见光明，方知物性',
  '观复': '万物并作，吾以观复',
  '藏真': '藏器于身，待时而动',
};

// ============================================================
// 工具函数
// ============================================================

/** 中文名 → 拼音 URL slug */
function toSlug(name) {
  const py = pinyinFn(name, { style: STYLE_NORMAL });
  return py
    .map(p => p[0])
    .join('-')
    .normalize('NFD')        // 分解声调符号
    .replace(/[\u0300-\u036f]/g, '')  // 移除声调
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
}

/** ERP 价格（分）→ 独立站价格（元） */
function toYuan(priceFen) {
  return priceFen / 100;
}

/** 生成 SKU */
function genSku(seqSlug, workIndex) {
  return `YW-${seqSlug.toUpperCase()}-${String(workIndex).padStart(2, '0')}`;
}

/** 从 JSON string 或数组提取封面图和画廊 */
function parseImages(imagesStr) {
  try {
    const arr = typeof imagesStr === 'string' ? JSON.parse(imagesStr) : imagesStr;
    if (!Array.isArray(arr) || arr.length === 0) return { coverImage: '', gallery: '[]' };
    return {
      coverImage: arr[0] || '',
      gallery: JSON.stringify(arr),
    };
  } catch {
    return { coverImage: '', gallery: '[]' };
  }
}

// ============================================================
// 主流程
// ============================================================

function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  允物 ERP → 独立站 数据同步          ║');
  console.log('╚══════════════════════════════════════╝\n');

  // 打开两个数据库
  const erp = new Database(ERP_DB_PATH, { readonly: true });
  const target = new Database(TARGET_DB_PATH);

  // 开启事务
  const sync = target.transaction(() => {
    // ── 第一步：清空目标数据库 ──
    console.log('📦 清空现有数据...');
    target.exec('DELETE FROM product_materials');
    target.exec('DELETE FROM materials');
    target.exec('DELETE FROM products');
    target.exec('DELETE FROM series');
    target.exec("DELETE FROM sqlite_sequence WHERE name IN ('series','products','materials','product_materials')");
    console.log('   ✅ 已清空');

    // ── 第二步：同步七序 → Series ──
    console.log('\n📖 同步七序...');
    const erpSequences = erp.prepare('SELECT id, name, description FROM sequences').all();
    const seqIdToSeriesId = {}; // ERP sequenceId → 独立站 series.id

    for (const seq of erpSequences) {
      const slug = SEQUENCE_SLUG_MAP[seq.name];
      if (!slug) {
        console.log(`   ⚠️  未知序列: ${seq.name}，跳过`);
        continue;
      }
      const heroText = SEQUENCE_HERO[seq.name] || '';
      const sortOrder = Object.keys(SEQUENCE_SLUG_MAP).indexOf(seq.name) + 1;

      const result = target.prepare(
        `INSERT INTO series (slug, name, description, heroText, sortOrder, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      ).run(slug, seq.name, seq.description, heroText, sortOrder);

      seqIdToSeriesId[seq.id] = result.lastInsertRowid;
      console.log(`   ✅ ${seq.name} (${slug}) → id=${result.lastInsertRowid}`);
    }

    // ── 第三步：同步材料 → Material ──
    console.log('\n🪨 同步材料库...');
    const erpMaterials = erp.prepare('SELECT id, name, type, description FROM materials').all();
    const matIdToMatId = {}; // ERP materialId → 独立站 material.id

    for (const mat of erpMaterials) {
      // 检查是否已存在
      const existing = target.prepare('SELECT id FROM materials WHERE name = ?').get(mat.name);
      if (existing) {
        matIdToMatId[mat.id] = existing.id;
        // 更新数据
        target.prepare(
          `UPDATE materials SET type = ?, description = ?, updatedAt = datetime('now') WHERE id = ?`
        ).run(mat.type, mat.description, existing.id);
        console.log(`   🔄 ${mat.name} → 已存在，更新`);
      } else {
        const result = target.prepare(
          `INSERT INTO materials (name, type, origin, description, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`
        ).run(mat.name, mat.type, '', mat.description);
        matIdToMatId[mat.id] = result.lastInsertRowid;
        console.log(`   ✅ ${mat.name} (${mat.type}) → id=${result.lastInsertRowid}`);
      }
    }

    // ── 第四步：同步作品 → Product ──
    console.log('\n🎨 同步作品...');
    const erpWorks = erp.prepare(
      'SELECT w.*, s.name as seq_name FROM works w JOIN sequences s ON w.sequenceId = s.id ORDER BY s.name, w.title'
    ).all();

    let productIndex = 0;

    for (const work of erpWorks) {
      const seriesId = seqIdToSeriesId[work.sequenceId];
      if (!seriesId) {
        console.log(`   ⚠️  作品「${work.title}」序列未映射，跳过`);
        continue;
      }

      const seqSlug = SEQUENCE_SLUG_MAP[work.seq_name] || '';
      productIndex++;
      const sku = genSku(seqSlug, productIndex);
      const slug = `${seqSlug}-${toSlug(work.title)}`;
      const { coverImage, gallery } = parseImages(work.images);
      const salePrice = toYuan(work.price);

      // 检查是否已存在
      const existing = target.prepare('SELECT id FROM products WHERE sku = ?').get(sku);

      let productId;
      if (existing) {
        productId = existing.id;
        target.prepare(
          `UPDATE products SET
            name = ?, slug = ?, series_id = ?, theme = ?, story = ?,
            sale_price = ?, cover_image = ?, gallery = ?, status = ?, updated_at = datetime('now')
           WHERE id = ?`
        ).run(work.title, slug, seriesId, work.description, work.story || '', salePrice, coverImage, gallery, 'published', productId);
        console.log(`   🔄 ${work.title} (¥${salePrice}) → 已存在，更新`);
      } else {
        const result = target.prepare(
          `INSERT INTO products (sku, name, slug, series_id, theme, story, sale_price, cover_image, gallery, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', datetime('now'), datetime('now'))`
        ).run(sku, work.title, slug, seriesId, work.description, work.story || '', salePrice, coverImage, gallery);
        productId = result.lastInsertRowid;
        console.log(`   ✅ ${work.title} (¥${salePrice}) → id=${productId}`);
      }

      // ── 第五步：同步材料关联 → ProductMaterial ──
      const workMaterials = erp.prepare(
        'SELECT materialId FROM work_materials WHERE workId = ?'
      ).all(work.id);

      for (const wm of workMaterials) {
        const targetMatId = matIdToMatId[wm.materialId];
        if (!targetMatId) continue;

        // 检查是否已关联
        const exists = target.prepare(
          'SELECT id FROM product_materials WHERE product_id = ? AND material_id = ?'
        ).get(productId, targetMatId);

        if (!exists) {
          target.prepare(
            'INSERT INTO product_materials (product_id, material_id) VALUES (?, ?)'
          ).run(productId, targetMatId);
        }
      }
    }
  });

  // 执行事务
  sync();

  // 输出统计
  const stats = {
    series: target.prepare('SELECT COUNT(*) as c FROM series').get().c,
    products: target.prepare('SELECT COUNT(*) as c FROM products').get().c,
    materials: target.prepare('SELECT COUNT(*) as c FROM materials').get().c,
    pm: target.prepare('SELECT COUNT(*) as c FROM product_materials').get().c,
  };

  console.log('\n═══════════════════════════════════════');
  console.log('  📊 同步完成！');
  console.log(`  七序: ${stats.series} 条`);
  console.log(`  作品: ${stats.products} 条`);
  console.log(`  材料: ${stats.materials} 条`);
  console.log(`  关联: ${stats.pm} 条`);
  console.log('═══════════════════════════════════════');

  // 关闭连接
  erp.close();
  target.close();
}

main();
