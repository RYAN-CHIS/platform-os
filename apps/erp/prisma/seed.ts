import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ═══════════════════════════════════════════
// V3: 权限系统种子数据
// ═══════════════════════════════════════════

const PERMISSION_DATA = [
  // Dashboard
  { code: "dashboard.view", name: "Dashboard 查看" },
  // 产品
  { code: "product.view", name: "产品查看" },
  { code: "product.edit", name: "产品编辑" },
  { code: "product.delete", name: "产品删除" },
  // SKU
  { code: "sku.view", name: "SKU 查看" },
  { code: "sku.edit", name: "SKU 编辑" },
  { code: "sku.delete", name: "SKU 删除" },
  // 作品
  { code: "work.view", name: "作品查看" },
  { code: "work.edit", name: "作品编辑" },
  { code: "work.delete", name: "作品删除" },
  // 材料
  { code: "material.view", name: "原材料查看" },
  { code: "material.edit", name: "原材料编辑" },
  { code: "material.delete", name: "原材料删除" },
  // 库存
  { code: "inventory.view", name: "库存查看" },
  { code: "inventory.edit", name: "库存编辑" },
  // BOM
  { code: "bom.view", name: "BOM 查看" },
  { code: "bom.edit", name: "BOM 编辑" },
  // 成本
  { code: "cost.view", name: "成本查看" },
  { code: "cost.edit", name: "成本编辑" },
  // 利润
  { code: "profit.view", name: "利润查看" },
  // 生产
  { code: "production.view", name: "生产查看" },
  { code: "production.create", name: "生产创建" },
  { code: "production.edit", name: "生产编辑" },
  // 订单
  { code: "order.view", name: "订单查看" },
  { code: "order.edit", name: "订单编辑" },
  // 客户
  { code: "customer.view", name: "客户查看" },
  { code: "customer.edit", name: "客户编辑" },
  // 用户
  { code: "user.view", name: "用户查看" },
  { code: "user.edit", name: "用户编辑" },
  // 设置
  { code: "setting.view", name: "设置查看" },
  { code: "setting.edit", name: "设置编辑" },
  // 导入导出
  { code: "import.data", name: "数据导入" },
  { code: "export.data", name: "数据导出" },
  // 超级管理员
  { code: "super.admin", name: "超级管理员" },
];

const PERMISSION_GROUP_CONFIG = [
  { code: "dashboard", name: "Dashboard", codes: ["dashboard.view"] },
  { code: "product", name: "产品管理", codes: ["product.view", "product.edit", "product.delete"] },
  { code: "sku", name: "SKU 管理", codes: ["sku.view", "sku.edit", "sku.delete"] },
  { code: "work", name: "作品管理", codes: ["work.view", "work.edit", "work.delete"] },
  { code: "material", name: "材料管理", codes: ["material.view", "material.edit", "material.delete"] },
  { code: "inventory", name: "库存管理", codes: ["inventory.view", "inventory.edit"] },
  { code: "bom", name: "BOM 管理", codes: ["bom.view", "bom.edit"] },
  { code: "cost", name: "成本管理", codes: ["cost.view", "cost.edit"] },
  { code: "profit", name: "利润", codes: ["profit.view"] },
  { code: "production", name: "生产管理", codes: ["production.view", "production.create", "production.edit"] },
  { code: "order", name: "订单管理", codes: ["order.view", "order.edit"] },
  { code: "customer", name: "客户管理", codes: ["customer.view", "customer.edit"] },
  { code: "user", name: "用户管理", codes: ["user.view", "user.edit"] },
  { code: "setting", name: "系统设置", codes: ["setting.view", "setting.edit"] },
  { code: "data", name: "数据导入导出", codes: ["import.data", "export.data"] },
  { code: "super", name: "超级管理员", codes: ["super.admin"] },
];

const PRESET_TEMPLATES = [
  {
    name: "管理员模板",
    role: "admin",
    description: "拥有系统全部权限",
    codes: PERMISSION_DATA.map((p) => p.code),
  },
  {
    name: "运营模板",
    role: "operator",
    description: "日常运营权限，不含成本和用户管理",
    codes: [
      "dashboard.view", "product.view", "product.edit",
      "sku.view", "sku.edit", "work.view", "work.edit",
      "order.view", "order.edit", "customer.view", "customer.edit",
      "production.view", "production.create",
      "inventory.view", "bom.view", "material.view",
    ],
  },
  {
    name: "仓库模板",
    role: "operator",
    description: "仓库管理权限，查看库存和材料",
    codes: [
      "dashboard.view", "inventory.view", "material.view",
      "bom.view", "production.view", "sku.view", "product.view",
    ],
  },
  {
    name: "财务模板",
    role: "operator",
    description: "财务权限，可查看成本和利润",
    codes: [
      "dashboard.view", "cost.view", "profit.view",
      "order.view", "product.view", "sku.view",
    ],
  },
  {
    name: "访客模板",
    role: "viewer",
    description: "仅只读基础信息",
    codes: ["dashboard.view", "product.view", "sku.view", "work.view"],
  },
];

async function seedPermissions() {
  // ── 1. 权限分组 ──
  for (const group of PERMISSION_GROUP_CONFIG) {
    await prisma.permissionGroup.upsert({
      where: { code: group.code },
      create: { code: group.code, name: group.name },
      update: { name: group.name },
    });
  }
  console.log("  ✅ 权限分组已就绪");

  // ── 2. 权限点 ──
  const groups = await prisma.permissionGroup.findMany();
  const groupMap = Object.fromEntries(groups.map((g) => [g.code, g.id]));

  for (const perm of PERMISSION_DATA) {
    // 找到所属分组
    const gcode = PERMISSION_GROUP_CONFIG.find((g) => g.codes.includes(perm.code))?.code;
    const groupId = gcode ? groupMap[gcode] : null;

    await prisma.permission.upsert({
      where: { code: perm.code },
      create: { code: perm.code, name: perm.name, groupId },
      update: { name: perm.name, groupId },
    });
  }
  console.log("  ✅ 权限点已就绪");

  // ── 3. 权限模板 ──
  const allPerms = await prisma.permission.findMany();
  const permMap = Object.fromEntries(allPerms.map((p) => [p.code, p.id]));

  for (const tmpl of PRESET_TEMPLATES) {
    const existing = await prisma.permissionTemplate.findFirst({
      where: { name: tmpl.name },
    });

    if (existing) {
      // 更新模板
      await prisma.permissionTemplate.update({
        where: { id: existing.id },
        data: { description: tmpl.description },
      });
      // 更新模板权限项
      await prisma.permissionTemplateItem.deleteMany({ where: { templateId: existing.id } });
      for (const code of tmpl.codes) {
        const permId = permMap[code];
        if (permId) {
          await prisma.permissionTemplateItem.create({
            data: { templateId: existing.id, permissionId: permId },
          });
        }
      }
    } else {
      // 创建模板
      const newTmpl = await prisma.permissionTemplate.create({
        data: { name: tmpl.name, role: tmpl.role, description: tmpl.description },
      });
      for (const code of tmpl.codes) {
        const permId = permMap[code];
        if (permId) {
          await prisma.permissionTemplateItem.create({
            data: { templateId: newTmpl.id, permissionId: permId },
          });
        }
      }
    }
  }
  console.log("  ✅ 权限模板已就绪");
}

// 七序取意
const SERIES_QUOTES: Record<string, string> = {
  fuchu: "清水出芙蓉，天然去雕饰。",
  qichi: "衡门之下，可以栖迟。",
  fusu: "山有扶苏，隰有荷华。",
  cangming: "北冥有鱼，其名为鲲。",
  jiming: "不知东方之既白。",
  guanfu: "万物并作，吾以观复。",
  cangzhen: "真者，所以受于天也，自然不可易也。",
};

const SERIES_KEYWORDS: Record<string, string> = {
  fuchu: "本真、喜悦、爱、美好、纯粹、生命力",
  qichi: "松弛、治愈、安住、归心、安顿",
  fusu: "成长、行动、创造、丰盛",
  cangming: "机遇、人脉、连接、格局、资源",
  jiming: "智慧、沉淀、定力、觉知",
  guanfu: "收藏、美学、回归、时间",
  cangzhen: "孤品、匠心、传承、永恒",
};

const SERIES_SUBTITLES: Record<string, string> = {
  fuchu: "本真之序",
  qichi: "归心之序",
  fusu: "生长之序",
  cangming: "格局之序",
  jiming: "觉知之序",
  guanfu: "收藏之序",
  cangzhen: "传承之序",
};

const WORKS: Record<string, { name: string; keyword: string; material: string; story: string }[]> = {
  fuchu: [
    { name: "初见", keyword: "本真", material: "粉晶", story: "人生最珍贵的状态，不是成功，而是第一次看见世界时的欢喜。粉晶温润，如初见时心跳的柔和。" },
    { name: "欢颜", keyword: "喜悦", material: "草莓晶", story: "欢喜的容颜，不掩饰、不造作。草莓晶的斑点如同欢笑时眼角的细纹，真实而生动。" },
    { name: "月白", keyword: "美好", material: "月光石", story: "月色下的白，是最干净的美好。月光石幽幽的光晕，是暗处依然温柔的证明。" },
    { name: "拾光", keyword: "纯粹", material: "珍珠", story: "拾起光阴中散落的纯粹。珍珠不雕不琢，以时间层层包裹，是最本真的圆满。" },
    { name: "清欢", keyword: "生命力", material: "白水晶", story: "清清淡欢中的生命力。白水晶通透无碍，看似平凡，却是最纯粹的力量所在。" },
  ],
  qichi: [
    { name: "小隐", keyword: "松弛", material: "白幽灵", story: "小隐于市，不必远走山林。白幽灵中层层山水之影，是心中自有一片松弛天地。" },
    { name: "归心", keyword: "归心", material: "月光石", story: "心安处即是归处。月光石柔光内敛，提醒你在繁忙中记得回到自己的心。" },
    { name: "松风", keyword: "治愈", material: "白水晶", story: "松林间的风，不急不缓。白水晶的清凉通透，如松风拂面，治愈焦躁。" },
    { name: "静川", keyword: "安住", material: "茶晶", story: "静水深流，安住当下。茶晶温厚沉稳，如一条静默的河流，安定而不张扬。" },
    { name: "忘机", keyword: "安顿", material: "白玛瑙", story: "忘却机心，安顿自我。白玛瑙温润如玉，不争不抢，是放下后真正的安顿。" },
  ],
  fusu: [
    { name: "启程", keyword: "行动", material: "黄水晶", story: "迈出第一步，便是生长的开始。黄水晶明亮的金色，是出发时心中的那束光。" },
    { name: "向阳", keyword: "成长", material: "金发晶", story: "向阳而生，成为更好的自己。金发晶中丝丝金光，是向上生长的力量。" },
    { name: "丰年", keyword: "丰盛", material: "金钛晶", story: "丰收之年，是努力后的自然回报。金钛晶璀璨如麦穗，是丰盛的具象。" },
    { name: "长风", keyword: "创造", material: "绿幽灵", story: "乘风破浪，创造属于自己的路。绿幽灵中金字塔般的内含物，是突破的力量。" },
    { name: "凌云", keyword: "志向", material: "太阳石", story: "凌云壮志，不设限的成长。太阳石闪烁的金色光点，是心中有光、眼中有远方的证明。" },
  ],
  cangming: [
    { name: "汇川", keyword: "连接", material: "绿幽灵", story: "海纳百川，有容乃大。绿幽灵中聚宝盆般的形态，是连接万物后的丰盈。" },
    { name: "和鸣", keyword: "人脉", material: "青金石", story: "琴瑟和鸣，是人与人之间最美的连接。青金石深邃的蓝底金星，是知音相遇的光。" },
    { name: "观海", keyword: "格局", material: "海蓝宝", story: "观海而知天下之大。海蓝宝如一汪海水握在掌中，提醒你以更大的视角看世界。" },
    { name: "长鲸", keyword: "资源", material: "蓝虎眼", story: "长鲸吞吐，是大海般浩瀚的资源。蓝虎眼流动的光带，是深藏不露的力量。" },
    { name: "九万里", keyword: "机遇", material: "堇青石", story: "鹏程九万里，机遇属于有准备的人。堇青石变幻的蓝紫光彩，是远方的召唤。" },
  ],
  jiming: [
    { name: "守拙", keyword: "定力", material: "老山檀", story: "大巧若拙，守拙是最大的定力。老山檀醇厚的香气，是繁华落尽后的从容。" },
    { name: "定境", keyword: "觉知", material: "沉香", story: "入定之境，万物了了分明。沉香结香的漫长岁月，是觉知在时间里沉淀。" },
    { name: "观止", keyword: "智慧", material: "黑金骨干", story: "叹为观止，是看见本质后的静默。黑金骨干深沉有力，是智慧不再外求的姿态。" },
    { name: "听雨", keyword: "沉淀", material: "崖柏", story: "听雨打芭蕉，是沉淀后听见的安静。崖柏清冽的香气，是雨后山林般的清明。" },
    { name: "知止", keyword: "知止", material: "紫光檀", story: "知止而后有定，是最高级的觉知。紫光檀沉静如墨，是懂得停下来之后的笃定。" },
  ],
  guanfu: [
    { name: "山居", keyword: "回归", material: "老矿绿松", story: "山居岁月长，是看遍繁华后的回归。老矿绿松的铁线纹路，是山川的印记。" },
    { name: "云隐", keyword: "美学", material: "超七", story: "云隐深处，是极致美学的栖居。超七中七种矿物共生，是自然之美的极致表达。" },
    { name: "观山", keyword: "收藏", material: "南红", story: "观山是山，是收藏者眼中的世界。南红温润如脂，是值得反复品味的收藏之美。" },
    { name: "归藏", keyword: "归藏", material: "蜜蜡", story: "万物归藏，是时间的最终馈赠。蜜蜡千万年的凝结，是岁月的琥珀。" },
    { name: "天工", keyword: "天工", material: "高瓷绿松", story: "巧夺天工，是人与天工的合奏。高瓷绿松如瓷器般细腻，是材质之美的巅峰。" },
  ],
  cangzhen: [
    { name: "甲辰壹号", keyword: "传承", material: "孤品收藏", story: "甲辰年编号壹号，是传承的起点。每一颗孤品都是独一无二的时间印记。" },
    { name: "岁月留香", keyword: "永恒", material: "孤品收藏", story: "岁月留香，是永恒的味道。时间越久，香气越沉，是经得起岁月的作品。" },
    { name: "天成", keyword: "匠心", material: "孤品收藏", story: "浑然天成，是匠心的最高境界。不雕不琢，让材质本身说话。" },
    { name: "无双", keyword: "孤品", material: "孤品收藏", story: "天下无双，是真正意义上的唯一。每一件都是不可复制的孤品。" },
  ],
};

const EXTRA_PRODUCTS: { seriesCode: string; workName: string; productName: string; category: string; spec: string }[] = [
  { seriesCode: "fuchu", workName: "初见", productName: "芙初·见喜", category: "香牌", spec: "合香牌" },
  { seriesCode: "fuchu", workName: "欢颜", productName: "芙初·闻风", category: "香牌", spec: "合香牌" },
  { seriesCode: "fuchu", workName: "拾光", productName: "芙初·小满", category: "皮具", spec: "卡包" },
  { seriesCode: "fuchu", workName: "欢颜", productName: "芙初·知春", category: "皮具", spec: "钥匙包" },
  { seriesCode: "fuchu", workName: "月白", productName: "芙初·初晴", category: "皮具", spec: "零钱包" },
  { seriesCode: "fuchu", workName: "初见", productName: "芙初·初心", category: "篆刻", spec: "姓名章" },
  { seriesCode: "fuchu", workName: "清欢", productName: "芙初·知白", category: "篆刻", spec: "闲章" },
  { seriesCode: "qichi", workName: "归心", productName: "栖迟·归园", category: "香牌", spec: "合香牌" },
  { seriesCode: "qichi", workName: "小隐", productName: "栖迟·云闲", category: "香牌", spec: "合香牌" },
  { seriesCode: "qichi", workName: "静川", productName: "栖迟·山房", category: "香牌", spec: "合香牌" },
  { seriesCode: "qichi", workName: "忘机", productName: "栖迟·半日闲", category: "皮具", spec: "手账皮套" },
  { seriesCode: "qichi", workName: "归心", productName: "栖迟·归途", category: "皮具", spec: "长夹" },
  { seriesCode: "qichi", workName: "松风", productName: "栖迟·松间", category: "皮具", spec: "月票夹" },
  { seriesCode: "qichi", workName: "小隐", productName: "栖迟·栖云", category: "篆刻", spec: "闲章" },
  { seriesCode: "qichi", workName: "忘机", productName: "栖迟·抱朴", category: "篆刻", spec: "闲章" },
  { seriesCode: "fusu", workName: "向阳", productName: "扶苏·青野", category: "香牌", spec: "合香牌" },
  { seriesCode: "fusu", workName: "长风", productName: "扶苏·远山", category: "香牌", spec: "合香牌" },
  { seriesCode: "fusu", workName: "启程", productName: "扶苏·远行", category: "皮具", spec: "护照夹" },
  { seriesCode: "fusu", workName: "长风", productName: "扶苏·开物", category: "皮具", spec: "商务卡包" },
  { seriesCode: "fusu", workName: "丰年", productName: "扶苏·有成", category: "皮具", spec: "笔套" },
  { seriesCode: "fusu", workName: "启程", productName: "扶苏·立志", category: "篆刻", spec: "闲章" },
  { seriesCode: "fusu", workName: "向阳", productName: "扶苏·知行", category: "篆刻", spec: "闲章" },
  { seriesCode: "cangming", workName: "九万里", productName: "沧溟·乘风", category: "香牌", spec: "合香牌" },
  { seriesCode: "cangming", workName: "观海", productName: "沧溟·远航", category: "香牌", spec: "合香牌" },
  { seriesCode: "cangming", workName: "汇川", productName: "沧溟·经纬", category: "皮具", spec: "公文包" },
  { seriesCode: "cangming", workName: "观海", productName: "沧溟·凌波", category: "皮具", spec: "长夹" },
  { seriesCode: "cangming", workName: "观海", productName: "沧溟·见海", category: "皮具", spec: "名片夹" },
  { seriesCode: "cangming", workName: "观海", productName: "沧溟·观澜", category: "篆刻", spec: "闲章" },
  { seriesCode: "cangming", workName: "九万里", productName: "沧溟·鹏举", category: "篆刻", spec: "闲章" },
  { seriesCode: "jiming", workName: "定境", productName: "既明·一炷", category: "香事", spec: "线香" },
  { seriesCode: "jiming", workName: "知止", productName: "既明·坐忘", category: "香事", spec: "盘香" },
  { seriesCode: "jiming", workName: "听雨", productName: "既明·清供", category: "香事", spec: "合香" },
  { seriesCode: "jiming", workName: "守拙", productName: "既明·守一", category: "皮具", spec: "卡包" },
  { seriesCode: "jiming", workName: "观止", productName: "既明·静观", category: "皮具", spec: "长夹" },
  { seriesCode: "jiming", workName: "听雨", productName: "既明·无尘", category: "皮具", spec: "零钱包" },
  { seriesCode: "jiming", workName: "知止", productName: "既明·慎独", category: "篆刻", spec: "闲章" },
  { seriesCode: "jiming", workName: "守拙", productName: "既明·守静", category: "篆刻", spec: "闲章" },
  { seriesCode: "guanfu", workName: "山居", productName: "观复·山房清供", category: "收藏香事", spec: "合香" },
  { seriesCode: "guanfu", workName: "观山", productName: "观复·闻道", category: "收藏香事", spec: "线香" },
  { seriesCode: "guanfu", workName: "归藏", productName: "观复·经年", category: "收藏皮具", spec: "长夹" },
  { seriesCode: "guanfu", workName: "归藏", productName: "观复·岁藏", category: "收藏皮具", spec: "卡包" },
  { seriesCode: "guanfu", workName: "山居", productName: "观复·山堂", category: "篆刻", spec: "收藏章" },
  { seriesCode: "guanfu", workName: "天工", productName: "观复·传薪", category: "篆刻", spec: "收藏章" },
  { seriesCode: "cangzhen", workName: "无双", productName: "藏真·印宗", category: "大师篆刻", spec: "大师章" },
  { seriesCode: "cangzhen", workName: "甲辰壹号", productName: "藏真·传世", category: "大师篆刻", spec: "大师章" },
  { seriesCode: "cangzhen", workName: "天成", productName: "藏真·藏锋", category: "大师篆刻", spec: "大师章" },
  { seriesCode: "cangzhen", workName: "岁月留香", productName: "藏真·经藏", category: "孤品皮具", spec: "定制皮具" },
  { seriesCode: "cangzhen", workName: "甲辰壹号", productName: "藏真·岁华", category: "孤品皮具", spec: "定制皮具" },
];

const RARITY_MAP: Record<string, number> = {
  fuchu: 1, qichi: 1, fusu: 2, cangming: 2, jiming: 3, guanfu: 4, cangzhen: 5,
};

async function main() {
  // ── V3: 权限系统种子 ──
  console.log("\n🔐 初始化权限系统 V3...");
  await seedPermissions();

  // 管理员账号
  const password = await bcrypt.hash("admin123", 10);
  const existing = await prisma.user.findUnique({ where: { email: "admin@yunwu.com" } });
  if (!existing) {
    await prisma.user.create({ data: { email: "admin@yunwu.com", password, role: "admin", name: "Admin" } });
    console.log("✅ 管理员账号创建成功");
  }

  // 七序排序
  const seriesOrder = ["fuchu", "qichi", "fusu", "cangming", "jiming", "guanfu", "cangzhen"];
  const seriesList = await prisma.series.findMany();
  const seriesMap = Object.fromEntries(seriesList.map((s) => [s.code, s]));
  for (let i = 0; i < seriesOrder.length; i++) {
    await prisma.series.update({ where: { code: seriesOrder[i] }, data: { sortOrder: i + 1 } });
  }

  // 作品+产品（幂等：已有作品则跳过）
  const existingWorks = await prisma.works.count();
  if (existingWorks === 0) {
    let workSeq = 1, productSeq = 1;
    const workNameToId: Record<string, number> = {};

    for (const seriesCode of seriesOrder) {
      const series = seriesMap[seriesCode];
      if (!series) continue;
      for (const w of WORKS[seriesCode]) {
        const workCode = `W${String(workSeq).padStart(3, "0")}`;
        const work = await prisma.works.create({ data: { code: workCode, name: w.name, seriesId: series.id, status: "READY" } });
        workNameToId[`${seriesCode}:${w.name}`] = work.id;

        await prisma.worksAssets.create({
          data: { workId: work.id, story: w.story, designConcept: `关键词：${w.keyword} | 序关键词：${SERIES_KEYWORDS[seriesCode]}`, quote: SERIES_QUOTES[seriesCode] },
        });

        const productCode = `P${String(productSeq).padStart(3, "0")}`;
        const productName = `${series.name}·${w.name}（${w.material}）`;
        const product = await prisma.products.create({ data: { code: productCode, name: productName, workId: work.id, status: "READY", description: `${SERIES_SUBTITLES[seriesCode]} · ${w.keyword}\n${w.story}\n材质：${w.material}手串` } });

        await prisma.productSku.create({ data: { code: `${productCode}-S01`, name: productName, productId: product.id, status: "READY", specification: w.material, size: "均码", price: 0, finishedStock: 0, rarityLevel: RARITY_MAP[seriesCode] } });
        workSeq++; productSeq++;
      }
    }

    // 附加产品
    for (const ep of EXTRA_PRODUCTS) {
      const workId = workNameToId[`${ep.seriesCode}:${ep.workName}`];
      if (!workId) continue;
      const series = seriesMap[ep.seriesCode];
      const productCode = `P${String(productSeq).padStart(3, "0")}`;
      const product = await prisma.products.create({ data: { code: productCode, name: ep.productName, workId, status: "READY", description: `${SERIES_SUBTITLES[ep.seriesCode]} · ${ep.category} · ${ep.spec}` } });
      await prisma.productSku.create({ data: { code: `${productCode}-S01`, name: ep.productName, productId: product.id, status: "READY", specification: ep.spec, size: "均码", price: 0, finishedStock: 0, rarityLevel: RARITY_MAP[ep.seriesCode] } });
      productSeq++;
    }
    console.log(`✅ 七序作品体系创建成功 (${workSeq - 1}件作品, ${productSeq - 1}个产品)`);
  }
}

main().catch((e) => { console.error("❌ 种子数据失败:", e); process.exit(1); }).finally(() => prisma.$disconnect());
