import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { createBrandDb, JournalCategory } from '@yunwu/brand-db';

const ERP_DB_PATH = '/Users/ryan/WorkBuddy/2026-06-17-22-01-58/backend/prisma/dev.db';
const SYNC_SCRIPT = resolve(__dirname, '..', 'scripts/sync-from-erp.mjs');

const db = createBrandDb();

async function seedJournalPosts() {
  const count = await db.journalPost.count();
  if (count > 0) {
    console.log('📝 Journal 文章已存在，跳过预置');
    return;
  }

  console.log('📝 预置 Journal 文章...');

  const posts = [
    {
      title: '东海寻珠记',
      slug: 'donghai-xun-zhu',
      excerpt: '从市场寻找材料，也寻找器物背后的时间。',
      content: `# 东海寻珠记\n\n从市场寻找材料，也寻找器物背后的时间。\n\n清晨的东海市场，空气里混杂着海盐、锈铁和旧木的气味。\n\n我们不是来买东西的。我们是来寻找那些被时间打磨过的材料——那些已经被自然、被人手、被岁月打好底色的珠子、坠子、碎片。\n\n## 不是挑选，是相遇\n\n很多人以为"寻珠"是挑最美的、最贵的、最完美的。\n\n不是的。\n\n我们在找的，是那些"已经活过"的材料。一颗老珠，表面已经氧化出温润的光泽；一块沉香，油脂线已经自然开裂又愈合；一片老银，敲打痕迹里藏着上一个主人的指纹。\n\n这些材料不是"原材料"。它们是"半完成品"——自然完成了前半段，现在等着有人完成后半段。\n\n## 材料的记忆\n\n东海的老人说：材料记得。\n\n一颗在海边捡到的珊瑚化石，记着千万年的海浪；一串清代的老珊瑚珠，记着几代人的体温；一块沉香，记着森林里雨后的潮湿和苏醒。\n\n## 寻珠之后\n\n允物的工作，是让这些故事继续。\n`,
      category: JournalCategory.DONGHAI,
      status: 'PUBLISHED' as const,
      publishedAt: new Date('2025-03-15'),
      seoTitle: '东海寻珠记｜允物品牌志',
      seoDescription: '从东海市场寻找材料，也寻找器物背后的时间。允物创始人记录寻珠路上的真实经历。',
    },
    {
      title: '为什么允物不谈开运',
      slug: 'why-not-promising-luck',
      excerpt: '器物无法改变命运，但可以提醒我们看见自己。',
      content: `# 为什么允物不谈开运\n\n器物无法改变命运，但可以提醒我们看见自己。\n\n允物创立之初，很多人问我们：你们的水晶开运吗？招财吗？旺桃花吗？\n\n我们的回答一直是：不。\n\n## 器物的边界\n\n我们认为，器物有自己的边界。\n\n一颗水晶、一串珠子、一件木作——它们可以陪伴你、提醒你、安定你。但它们不能替你活你的人生，不能替你做你的选择，不能替你承担你的后果。\n\n## 看见，而不是改变\n\n允物想做的，是帮你"看见"。\n\n看见你本来就有的安定。\n看见你本来就有的清醒。\n看见你本来就有的力量。\n\n器物是一个介质——它不动，也不说话。但当你凝视它的时候，你会慢下来。\n\n## 写在最后\n\n让物归物，让心归心。\n`,
      category: JournalCategory.PHILOSOPHY,
      status: 'PUBLISHED' as const,
      publishedAt: new Date('2025-04-02'),
      seoTitle: '为什么允物不谈开运｜允物品牌志',
      seoDescription: '器物无法改变命运，但可以提醒我们看见自己。允物坚持不谈开运、不谈招财的理性品牌态度。',
    },
    {
      title: '白水晶的克制之美',
      slug: 'white-crystal-restraint',
      excerpt: '真正耐看的材料，往往最朴素。',
      content: `# 白水晶的克制之美\n\n真正耐看的材料，往往最朴素。\n\n在允物的材料体系里，白水晶是最安静的一种。\n\n## 透明，不是空白\n\n白水晶的美，是"需要看第二眼"的美。\n\n## 克制，不是单调\n\n允物选择白水晶，是因为我们相信：真正耐看的材料，往往最朴素。\n\n一件用白水晶做的作品，你第一天戴觉得"挺干净"。第十天戴觉得"挺舒服"。第一百天戴觉得"已经是身体的一部分了"。\n\n## 写在最后\n\n让物归物。白水晶只是白水晶。\n`,
      category: JournalCategory.MATERIAL,
      status: 'PUBLISHED' as const,
      publishedAt: new Date('2025-02-20'),
      seoTitle: '白水晶的克制之美｜允物品牌志',
      seoDescription: '真正耐看的材料，往往最朴素。允物讲述白水晶的克制之美。',
    },
    {
      title: '关于七序',
      slug: 'about-seven-sequences',
      excerpt: '七序不是产品分类，而是人生阶段。',
      content: `# 关于七序\n\n七序不是产品分类，而是人生阶段。\n\n允物用"七序"来组织我们的作品体系。七序是为了描述"一个人和自己相处的过程"。\n\n## 七序是哪七序？\n\n**芙初** — 春天，万物初生。\n\n**藏真** — 发现自己原来有很多层面。\n\n**见素** — 剥掉外层，看见本质。\n\n**守拙** — 接受自己的不完美。\n\n**观山** — 看见更大的世界。\n\n**自在** — 不需要刻意。\n\n**归藏** — 回到起点，但不同了。\n\n## 写在最后\n\n七序只是一个地图，走路的人是你。\n`,
      category: JournalCategory.OBJECT,
      status: 'PUBLISHED' as const,
      publishedAt: new Date('2025-01-10'),
      seoTitle: '关于七序｜允物品牌世界观',
      seoDescription: '七序不是产品分类，而是人生阶段。深入了解允物七序世界观。',
    },
    {
      title: '为什么做印章',
      slug: 'why-seal-carving',
      excerpt: '印章是人与文字之间最亲密的器物。',
      content: `# 为什么做印章\n\n印章是人与文字之间最亲密的器物。\n\n在所有的东方器物里，印章是最特殊的一类。\n\n它不是用来观看的，是用来"留下"的。\n\n## 一方印章，一个立场\n\n印章刻的是字，但留下的是态度。\n\n允物做的印章，不只是装饰。我们希望每一方印章都有它的立意——一句话，一个词，一种对自己的期许。\n\n## 器物与文字\n\n东方文化里，文字一直有重量。\n\n把这个重量浓缩成一方石头，用朱砂印下，留在纸上——这是一种古老的，也是当代的，与自己对话的方式。\n\n让物归物。印章只是印章。但它刻下的，是你的立场。\n`,
      category: JournalCategory.OBJECT,
      status: 'PUBLISHED' as const,
      publishedAt: new Date('2025-05-20'),
      seoTitle: '为什么做印章｜允物器物志',
      seoDescription: '印章是人与文字之间最亲密的器物。允物讲述为什么在当代做印章。',
    },
    {
      title: '掐丝珐琅研究',
      slug: 'cloisonne-research',
      excerpt: '一道金丝，隔开了两个颜色，也隔开了两种人生。',
      content: `# 掐丝珐琅研究\n\n一道金丝，隔开了两个颜色，也隔开了两种人生。\n\n## 什么是掐丝珐琅\n\n掐丝珐琅，俗称"景泰蓝"，是中国传统工艺美术品类之一。\n\n制作工序：铜胎制作 → 掐丝 → 点蓝 → 烧蓝 → 磨光 → 镀金。\n\n每一道工序都需要高度专注。错了，就要从头来过。\n\n## 工艺与器物\n\n允物研究珐琅，不是要复原一件古物。\n\n我们想理解的是：这道工艺里藏着什么样的精神？\n\n掐丝，是把混沌分开，让每一块颜色有自己的边界。这件事，和生活里的很多事很像。\n\n让物归物。珐琅只是珐琅。但那道金丝，值得认真对待。\n`,
      category: JournalCategory.CRAFT,
      status: 'PUBLISHED' as const,
      publishedAt: new Date('2025-06-01'),
      seoTitle: '掐丝珐琅研究｜允物工艺志',
      seoDescription: '一道金丝，隔开了两个颜色。允物深入研究掐丝珐琅工艺与精神。',
    },
  ];

  for (const post of posts) {
    await db.journalPost.create({ data: post });
    console.log(`  ✓ ${post.title}`);
  }

  console.log('✅ Journal 文章预置完成\n');
}

async function main() {
  console.log('🌿 允物独立站 — 数据初始化\n');

  if (existsSync(ERP_DB_PATH)) {
    console.log('📡 检测到 ERP 数据库，从 ERP 同步作品数据...\n');
    try {
      execSync(`node "${SYNC_SCRIPT}"`, { stdio: 'inherit' });
      console.log('\n✅ ERP 数据同步完成');
    } catch (err) {
      console.error('⚠️ 同步失败，回退到内置种子数据:', err);
    }
  } else {
    console.log('⚠️ 未检测到 ERP 数据库，使用内置种子数据\n');
  }

  // 预置 Journal 文章
  await seedJournalPosts();

  console.log('✅ 初始化完成');
}

main()
  .catch(console.error)
  .finally(async () => {
    await db.$disconnect();
    process.exit(0);
  });
