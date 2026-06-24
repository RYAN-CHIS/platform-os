/** /erp/materials — P13A Full CRUD */
import { prisma } from "@yunwu/db";
import { MATERIAL_CATEGORIES } from "@yunwu/platform-core";
import MaterialsClient from "./client";

// Map sidebar category query to DB search keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  beads: ["水晶", "珠子", "宝石", "玛瑙", "玉石", "珍珠", "月光石", "草莓", "白水晶", "紫水晶", "粉晶"],
  accessories: ["配件", "链", "扣", "环", "钩", "绳", "线", "弹性", "金属"],
  ceramics: ["瓷", "陶瓷", "陶", "杯", "碗", "盘"],
  leather: ["皮革", "皮", "革", "牛皮", "羊皮", "磨毛"],
};

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = String(sp?.q || "").trim();
  const category = String(sp?.category || "").trim();

  // Build where clause
  let where: any = {};
  const conditions: any[] = [];

  if (q) {
    conditions.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { code: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (category && CATEGORY_KEYWORDS[category]) {
    const keywords = CATEGORY_KEYWORDS[category];
    conditions.push({
      OR: keywords.map((kw) => ({
        category: { contains: kw, mode: "insensitive" },
      })),
    });
  }

  if (conditions.length === 1) {
    where = conditions[0];
  } else if (conditions.length > 1) {
    where = { AND: conditions };
  }

  // Fail-safe query: wrap in try/catch to prevent page crash on DB schema mismatch
  let materials: any[] = [];
  try {
    materials = await prisma.erpMaterial.findMany({
      take: 200,
      orderBy: { code: "asc" },
      where: Object.keys(where).length > 0 ? where : undefined,
    });
  } catch (e: any) {
    console.error("Materials query failed:", e.message);
    // Return empty array — client will show error state
  }

  const csvColumns = [
    { key: "code", label: "编码" },
    { key: "name", label: "名称" },
    { key: "category", label: "分类" },
    { key: "materialType", label: "类型" },
    { key: "inventoryUnit", label: "单位" },
    { key: "remaining", label: "库存" },
    { key: "unitCost", label: "单价" },
    { key: "specification", label: "规格" },
  ];

  const csvData = materials.map((m) => ({
    code: m.code,
    name: m.name,
    category: m.category,
    materialType: m.materialType,
    inventoryUnit: m.inventoryUnit,
    remaining: m.remaining,
    unitCost: m.unitCost,
    specification: m.specification,
  }));

  // Get category label for title
  const catInfo = MATERIAL_CATEGORIES.find((c) => c.query === category);
  const title = catInfo ? `${catInfo.label}材料` : "材料管理";

  return (
    <MaterialsClient
      initialData={JSON.parse(JSON.stringify(materials))}
      csvColumns={csvColumns}
      csvData={csvData}
      category={category}
      title={title}
    />
  );
}
