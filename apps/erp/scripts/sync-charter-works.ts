/**
 * 允物品牌宪章 - 七序作品体系全量录入脚本
 * 
 * 数据来源：《允物品牌宪章》第四篇 + 允物品牌体系.md
 * 
 * 结构：
 *   Series（七序）→ Works（34件作品）→ Products（产品）→ ProductSku（SKU）
 * 
 * 每个「序」有5件作品（藏真为4件），每件作品对应一条手串产品。
 * 香牌/皮具/篆刻等附加产品归属到同一序中主题最接近的作品下。
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ============ 七序取意（来自宪章） ============
const SERIES_QUOTES: Record<string, string> = {
  fuchu: "清水出芙蓉，天然去雕饰。",
  qichi: "衡门之下，可以栖迟。",
  fusu: "山有扶苏，隰有荷华。",
  cangming: "北冥有鱼，其名为鲲。",
  jiming: "不知东方之既白。",
  guanfu: "万物并作，吾以观复。",
  cangzhen: "真者，所以受于天也，自然不可易也。",
};

// ============ 七序关键词（来自宪章） ============
const SERIES_KEYWORDS: Record<string, string> = {
  fuchu: "本真、喜悦、爱、美好、纯粹、生命力",
  qichi: "松弛、治愈、安住、归心、安顿",
  fusu: "成长、行动、创造、丰盛",
  cangming: "机遇、人脉、连接、格局、资源",
  jiming: "智慧、沉淀、定力、觉知",
  guanfu: "收藏、美学、回归、时间",
  cangzhen: "孤品、匠心、传承、永恒",
};

// ============ 七序副标题 ============
const SERIES_SUBTITLES: Record<string, string> = {
  fuchu: "本真之序",
  qichi: "归心之序",
  fusu: "生长之序",
  cangming: "格局之序",
  jiming: "觉知之序",
  guanfu: "收藏之序",
  cangzhen: "传承之序",
};

// ============ 作品定义 ============
// 每件作品：序号、作品名、关键词、手串材质、手串描述
interface WorkDef {
  name: string;
  keyword: string;
  braceletMaterial: string;
  story: string;
}

const WORKS: Record<string, WorkDef[]> = {
  fuchu: [
    { name: "初见", keyword: "本真", braceletMaterial: "粉晶", story: "人生最珍贵的状态，不是成功，而是第一次看见世界时的欢喜。粉晶温润，如初见时心跳的柔和。" },
    { name: "欢颜", keyword: "喜悦", braceletMaterial: "草莓晶", story: "欢喜的容颜，不掩饰、不造作。草莓晶的斑点如同欢笑时眼角的细纹，真实而生动。" },
    { name: "月白", keyword: "美好", braceletMaterial: "月光石", story: "月色下的白，是最干净的美好。月光石幽幽的光晕，是暗处依然温柔的证明。" },
    { name: "拾光", keyword: "纯粹", braceletMaterial: "珍珠", story: "拾起光阴中散落的纯粹。珍珠不雕不琢，以时间层层包裹，是最本真的圆满。" },
    { name: "清欢", keyword: "生命力", braceletMaterial: "白水晶", story: "清清淡欢中的生命力。白水晶通透无碍，看似平凡，却是最纯粹的力量所在。" },
  ],
  qichi: [
    { name: "小隐", keyword: "松弛", braceletMaterial: "白幽灵", story: "小隐于市，不必远走山林。白幽灵中层层山水之影，是心中自有一片松弛天地。" },
    { name: "归心", keyword: "归心", braceletMaterial: "月光石", story: "心安处即是归处。月光石柔光内敛，提醒你在繁忙中记得回到自己的心。" },
    { name: "松风", keyword: "治愈", braceletMaterial: "白水晶", story: "松林间的风，不急不缓。白水晶的清凉通透，如松风拂面，治愈焦躁。" },
    { name: "静川", keyword: "安住", braceletMaterial: "茶晶", story: "静水深流，安住当下。茶晶温厚沉稳，如一条静默的河流，安定而不张扬。" },
    { name: "忘机", keyword: "安顿", braceletMaterial: "白玛瑙", story: "忘却机心，安顿自我。白玛瑙温润如玉，不争不抢，是放下后真正的安顿。" },
  ],
  fusu: [
    { name: "启程", keyword: "行动", braceletMaterial: "黄水晶", story: "迈出第一步，便是生长的开始。黄水晶明亮的金色，是出发时心中的那束光。" },
    { name: "向阳", keyword: "成长", braceletMaterial: "金发晶", story: "向阳而生，成为更好的自己。金发晶中丝丝金光，是向上生长的力量。" },
    { name: "丰年", keyword: "丰盛", braceletMaterial: "金钛晶", story: "丰收之年，是努力后的自然回报。金钛晶璀璨如麦穗，是丰盛的具象。" },
    { name: "长风", keyword: "创造", braceletMaterial: "绿幽灵", story: "乘风破浪，创造属于自己的路。绿幽灵中金字塔般的内含物，是突破的力量。" },
    { name: "凌云", keyword: "志向", braceletMaterial: "太阳石", story: "凌云壮志，不设限的成长。太阳石闪烁的金色光点，是心中有光、眼中有远方的证明。" },
  ],
  cangming: [
    { name: "汇川", keyword: "连接", braceletMaterial: "绿幽灵", story: "海纳百川，有容乃大。绿幽灵中聚宝盆般的形态，是连接万物后的丰盈。" },
    { name: "和鸣", keyword: "人脉", braceletMaterial: "青金石", story: "琴瑟和鸣，是人与人之间最美的连接。青金石深邃的蓝底金星，是知音相遇的光。" },
    { name: "观海", keyword: "格局", braceletMaterial: "海蓝宝", story: "观海而知天下之大。海蓝宝如一汪海水握在掌中，提醒你以更大的视角看世界。" },
    { name: "长鲸", keyword: "资源", braceletMaterial: "蓝虎眼", story: "长鲸吞吐，是大海般浩瀚的资源。蓝虎眼流动的光带，是深藏不露的力量。" },
    { name: "九万里", keyword: "机遇", braceletMaterial: "堇青石", story: "鹏程九万里，机遇属于有准备的人。堇青石变幻的蓝紫光彩，是远方的召唤。" },
  ],
  jiming: [
    { name: "守拙", keyword: "定力", braceletMaterial: "老山檀", story: "大巧若拙，守拙是最大的定力。老山檀醇厚的香气，是繁华落尽后的从容。" },
    { name: "定境", keyword: "觉知", braceletMaterial: "沉香", story: "入定之境，万物了了分明。沉香结香的漫长岁月，是觉知在时间里沉淀。" },
    { name: "观止", keyword: "智慧", braceletMaterial: "黑金骨干", story: "叹为观止，是看见本质后的静默。黑金骨干深沉有力，是智慧不再外求的姿态。" },
    { name: "听雨", keyword: "沉淀", braceletMaterial: "崖柏", story: "听雨打芭蕉，是沉淀后听见的安静。崖柏清冽的香气，是雨后山林般的清明。" },
    { name: "知止", keyword: "知止", braceletMaterial: "紫光檀", story: "知止而后有定，是最高级的觉知。紫光檀沉静如墨，是懂得停下来之后的笃定。" },
  ],
  guanfu: [
    { name: "山居", keyword: "回归", braceletMaterial: "老矿绿松", story: "山居岁月长，是看遍繁华后的回归。老矿绿松的铁线纹路，是山川的印记。" },
    { name: "云隐", keyword: "美学", braceletMaterial: "超七", story: "云隐深处，是极致美学的栖居。超七中七种矿物共生，是自然之美的极致表达。" },
    { name: "观山", keyword: "收藏", braceletMaterial: "南红", story: "观山是山，是收藏者眼中的世界。南红温润如脂，是值得反复品味的收藏之美。" },
    { name: "归藏", keyword: "归藏", braceletMaterial: "蜜蜡", story: "万物归藏，是时间的最终馈赠。蜜蜡千万年的凝结，是岁月的琥珀。" },
    { name: "天工", keyword: "天工", braceletMaterial: "高瓷绿松", story: "巧夺天工，是人与天工的合奏。高瓷绿松如瓷器般细腻，是材质之美的巅峰。" },
  ],
  cangzhen: [
    { name: "甲辰壹号", keyword: "传承", braceletMaterial: "孤品收藏", story: "甲辰年编号壹号，是传承的起点。每一颗孤品都是独一无二的时间印记。" },
    { name: "岁月留香", keyword: "永恒", braceletMaterial: "孤品收藏", story: "岁月留香，是永恒的味道。时间越久，香气越沉，是经得起岁月的作品。" },
    { name: "天成", keyword: "匠心", braceletMaterial: "孤品收藏", story: "浑然天成，是匠心的最高境界。不雕不琢，让材质本身说话。" },
    { name: "无双", keyword: "孤品", braceletMaterial: "孤品收藏", story: "天下无双，是真正意义上的唯一。每一件都是不可复制的孤品。" },
  ],
};

// ============ 附加产品（香牌/皮具/篆刻） ============
// 归属到同序中主题最接近的作品
interface ExtraProductDef {
  seriesCode: string;
  workName: string;     // 归属的作品名
  productName: string;  // 产品名（含序号前缀）
  category: string;     // 品类：香牌/皮具/篆刻/香事/收藏香事/收藏皮具/大师篆刻/孤品皮具/年度收藏
  spec: string;         // 规格/类型
}

const EXTRA_PRODUCTS: ExtraProductDef[] = [
  // 芙初
  { seriesCode: "fuchu", workName: "初见", productName: "芙初·见喜", category: "香牌", spec: "合香牌" },
  { seriesCode: "fuchu", workName: "欢颜", productName: "芙初·闻风", category: "香牌", spec: "合香牌" },
  { seriesCode: "fuchu", workName: "拾光", productName: "芙初·小满", category: "皮具", spec: "卡包" },
  { seriesCode: "fuchu", workName: "欢颜", productName: "芙初·知春", category: "皮具", spec: "钥匙包" },
  { seriesCode: "fuchu", workName: "月白", productName: "芙初·初晴", category: "皮具", spec: "零钱包" },
  { seriesCode: "fuchu", workName: "初见", productName: "芙初·初心", category: "篆刻", spec: "姓名章" },
  { seriesCode: "fuchu", workName: "清欢", productName: "芙初·知白", category: "篆刻", spec: "闲章" },

  // 栖迟
  { seriesCode: "qichi", workName: "归心", productName: "栖迟·归园", category: "香牌", spec: "合香牌" },
  { seriesCode: "qichi", workName: "小隐", productName: "栖迟·云闲", category: "香牌", spec: "合香牌" },
  { seriesCode: "qichi", workName: "静川", productName: "栖迟·山房", category: "香牌", spec: "合香牌" },
  { seriesCode: "qichi", workName: "忘机", productName: "栖迟·半日闲", category: "皮具", spec: "手账皮套" },
  { seriesCode: "qichi", workName: "归心", productName: "栖迟·归途", category: "皮具", spec: "长夹" },
  { seriesCode: "qichi", workName: "松风", productName: "栖迟·松间", category: "皮具", spec: "月票夹" },
  { seriesCode: "qichi", workName: "小隐", productName: "栖迟·栖云", category: "篆刻", spec: "闲章" },
  { seriesCode: "qichi", workName: "忘机", productName: "栖迟·抱朴", category: "篆刻", spec: "闲章" },

  // 扶苏
  { seriesCode: "fusu", workName: "向阳", productName: "扶苏·青野", category: "香牌", spec: "合香牌" },
  { seriesCode: "fusu", workName: "长风", productName: "扶苏·远山", category: "香牌", spec: "合香牌" },
  { seriesCode: "fusu", workName: "启程", productName: "扶苏·远行", category: "皮具", spec: "护照夹" },
  { seriesCode: "fusu", workName: "长风", productName: "扶苏·开物", category: "皮具", spec: "商务卡包" },
  { seriesCode: "fusu", workName: "丰年", productName: "扶苏·有成", category: "皮具", spec: "笔套" },
  { seriesCode: "fusu", workName: "启程", productName: "扶苏·立志", category: "篆刻", spec: "闲章" },
  { seriesCode: "fusu", workName: "向阳", productName: "扶苏·知行", category: "篆刻", spec: "闲章" },

  // 沧溟
  { seriesCode: "cangming", workName: "九万里", productName: "沧溟·乘风", category: "香牌", spec: "合香牌" },
  { seriesCode: "cangming", workName: "观海", productName: "沧溟·远航", category: "香牌", spec: "合香牌" },
  { seriesCode: "cangming", workName: "汇川", productName: "沧溟·经纬", category: "皮具", spec: "公文包" },
  { seriesCode: "cangming", workName: "观海", productName: "沧溟·凌波", category: "皮具", spec: "长夹" },
  { seriesCode: "cangming", workName: "观海", productName: "沧溟·见海", category: "皮具", spec: "名片夹" },
  { seriesCode: "cangming", workName: "观海", productName: "沧溟·观澜", category: "篆刻", spec: "闲章" },
  { seriesCode: "cangming", workName: "九万里", productName: "沧溟·鹏举", category: "篆刻", spec: "闲章" },

  // 既明
  { seriesCode: "jiming", workName: "定境", productName: "既明·一炷", category: "香事", spec: "线香" },
  { seriesCode: "jiming", workName: "知止", productName: "既明·坐忘", category: "香事", spec: "盘香" },
  { seriesCode: "jiming", workName: "听雨", productName: "既明·清供", category: "香事", spec: "合香" },
  { seriesCode: "jiming", workName: "守拙", productName: "既明·守一", category: "皮具", spec: "卡包" },
  { seriesCode: "jiming", workName: "观止", productName: "既明·静观", category: "皮具", spec: "长夹" },
  { seriesCode: "jiming", workName: "听雨", productName: "既明·无尘", category: "皮具", spec: "零钱包" },
  { seriesCode: "jiming", workName: "知止", productName: "既明·慎独", category: "篆刻", spec: "闲章" },
  { seriesCode: "jiming", workName: "守拙", productName: "既明·守静", category: "篆刻", spec: "闲章" },

  // 观复
  { seriesCode: "guanfu", workName: "山居", productName: "观复·山房清供", category: "收藏香事", spec: "合香" },
  { seriesCode: "guanfu", workName: "观山", productName: "观复·闻道", category: "收藏香事", spec: "线香" },
  { seriesCode: "guanfu", workName: "归藏", productName: "观复·经年", category: "收藏皮具", spec: "长夹" },
  { seriesCode: "guanfu", workName: "归藏", productName: "观复·岁藏", category: "收藏皮具", spec: "卡包" },
  { seriesCode: "guanfu", workName: "山居", productName: "观复·山堂", category: "篆刻", spec: "收藏章" },
  { seriesCode: "guanfu", workName: "天工", productName: "观复·传薪", category: "篆刻", spec: "收藏章" },

  // 藏真
  { seriesCode: "cangzhen", workName: "无双", productName: "藏真·印宗", category: "大师篆刻", spec: "大师章" },
  { seriesCode: "cangzhen", workName: "甲辰壹号", productName: "藏真·传世", category: "大师篆刻", spec: "大师章" },
  { seriesCode: "cangzhen", workName: "天成", productName: "藏真·藏锋", category: "大师篆刻", spec: "大师章" },
  { seriesCode: "cangzhen", workName: "岁月留香", productName: "藏真·经藏", category: "孤品皮具", spec: "定制皮具" },
  { seriesCode: "cangzhen", workName: "甲辰壹号", productName: "藏真·岁华", category: "孤品皮具", spec: "定制皮具" },
];

// ============ 稀有度映射 ============
const RARITY_MAP: Record<string, number> = {
  fuchu: 1,
  qichi: 1,
  fusu: 2,
  cangming: 2,
  jiming: 3,
  guanfu: 4,
  cangzhen: 5,
};

async function main() {
  console.log("=== 允物品牌宪章 - 七序作品体系录入 ===\n");

  // Step 0: 获取 series 映射
  const allSeries = await prisma.series.findMany({ orderBy: { id: "asc" } });
  const seriesMap = Object.fromEntries(allSeries.map((s) => [s.code, s]));
  console.log("Series:", allSeries.map((s) => `${s.code}(${s.id})`).join(", "));

  // Step 1: 更新 series sortOrder + subtitle
  console.log("\n--- 更新七序排序 ---");
  const seriesOrder = ["fuchu", "qichi", "fusu", "cangming", "jiming", "guanfu", "cangzhen"];
  for (let i = 0; i < seriesOrder.length; i++) {
    const code = seriesOrder[i];
    await prisma.series.update({
      where: { code },
      data: { sortOrder: i + 1 },
    });
    console.log(`  ${code} → sortOrder: ${i + 1}`);
  }

  // Step 2: 删除旧数据（works → products → skus 级联）
  console.log("\n--- 清理旧数据 ---");
  const oldSkus = await prisma.productSku.deleteMany({});
  console.log(`  删除 SKU: ${oldSkus.count}`);
  const oldProducts = await prisma.products.deleteMany({});
  console.log(`  删除 Products: ${oldProducts.count}`);
  const oldAssets = await prisma.worksAssets.deleteMany({});
  console.log(`  删除 WorksAssets: ${oldAssets.count}`);
  const oldWorks = await prisma.works.deleteMany({});
  console.log(`  删除 Works: ${oldWorks.count}`);

  // Step 3: 创建 34 件作品 + WorksAssets + 手串产品 + SKU
  console.log("\n--- 创建作品 + 产品 + SKU ---");
  let workSeq = 1;
  let productSeq = 1;
  const workNameToId: Record<string, number> = {}; // "fuchu:初见" → workId

  for (const seriesCode of seriesOrder) {
    const series = seriesMap[seriesCode];
    const works = WORKS[seriesCode];
    const quote = SERIES_QUOTES[seriesCode];
    const keywords = SERIES_KEYWORDS[seriesCode];
    const subtitle = SERIES_SUBTITLES[seriesCode];
    const rarity = RARITY_MAP[seriesCode];

    console.log(`\n  【${series.name}·${subtitle}】 取意："${quote}"`);
    console.log(`  关键词：${keywords}`);

    for (const w of works) {
      const workCode = `W${String(workSeq).padStart(3, "0")}`;

      // 创建作品
      const work = await prisma.works.create({
        data: {
          code: workCode,
          name: w.name,
          seriesId: series.id,
          status: "READY",
        },
      });
      workNameToId[`${seriesCode}:${w.name}`] = work.id;

      // 创建作品资产（关键词、故事、取意）
      await prisma.worksAssets.create({
        data: {
          workId: work.id,
          story: w.story,
          designConcept: `关键词：${w.keyword} | 序关键词：${keywords}`,
          quote: quote,
        },
      });

      // 创建手串产品
      const productCode = `P${String(productSeq).padStart(3, "0")}`;
      const productName = `${series.name}·${w.name}（${w.braceletMaterial}）`;
      const product = await prisma.products.create({
        data: {
          code: productCode,
          name: productName,
          workId: work.id,
          status: "READY",
          description: `${subtitle} · ${w.keyword}\n${w.story}\n材质：${w.braceletMaterial}手串`,
        },
      });

      // 创建 SKU
      await prisma.productSku.create({
        data: {
          code: `${productCode}-S01`,
          name: productName,
          productId: product.id,
          status: "READY",
          specification: w.braceletMaterial,
          size: "均码",
          price: 0,
          finishedStock: 0,
          rarityLevel: rarity,
        },
      });

      console.log(`    ✅ ${workCode} ${w.name}（${w.keyword}）→ ${productCode} ${productName}`);
      workSeq++;
      productSeq++;
    }
  }

  // Step 4: 创建附加产品（香牌/皮具/篆刻等）
  console.log("\n--- 创建附加产品（香牌/皮具/篆刻） ---");
  for (const ep of EXTRA_PRODUCTS) {
    const workId = workNameToId[`${ep.seriesCode}:${ep.workName}`];
    if (!workId) {
      console.log(`  ⚠️ 未找到作品: ${ep.seriesCode}:${ep.workName}`);
      continue;
    }

    const series = seriesMap[ep.seriesCode];
    const rarity = RARITY_MAP[ep.seriesCode];
    const productCode = `P${String(productSeq).padStart(3, "0")}`;

    const product = await prisma.products.create({
      data: {
        code: productCode,
        name: ep.productName,
        workId,
        status: "READY",
        description: `${SERIES_SUBTITLES[ep.seriesCode]} · ${ep.category} · ${ep.spec}`,
      },
    });

    await prisma.productSku.create({
      data: {
        code: `${productCode}-S01`,
        name: ep.productName,
        productId: product.id,
        status: "READY",
        specification: ep.spec,
        size: "均码",
        price: 0,
        finishedStock: 0,
        rarityLevel: rarity,
      },
    });

    console.log(`  ✅ ${productCode} ${ep.productName}（${ep.category}）→ 作品「${ep.workName}」`);
    productSeq++;
  }

  // Step 5: 统计
  console.log("\n=== 录入完成 ===");
  const totalWorks = await prisma.works.count();
  const totalProducts = await prisma.products.count();
  const totalSkus = await prisma.productSku.count();
  const totalAssets = await prisma.worksAssets.count();

  console.log(`  作品(Works):       ${totalWorks}`);
  console.log(`  作品资产(Assets):  ${totalAssets}`);
  console.log(`  产品(Products):    ${totalProducts}`);
  console.log(`  SKU:               ${totalSkus}`);

  // 按序分组统计
  console.log("\n--- 按序统计 ---");
  for (const code of seriesOrder) {
    const s = seriesMap[code];
    const wCount = await prisma.works.count({ where: { seriesId: s.id } });
    const works = await prisma.works.findMany({
      where: { seriesId: s.id },
      select: { id: true },
    });
    const pCount = await prisma.products.count({
      where: { workId: { in: works.map((w) => w.id) } },
    });
    console.log(`  ${s.name}（${SERIES_SUBTITLES[code]}）: ${wCount}件作品, ${pCount}个产品`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
