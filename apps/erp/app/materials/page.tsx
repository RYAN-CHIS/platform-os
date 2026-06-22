import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { canViewCost } from "@/lib/permissions";
import MaterialsClient from "./MaterialsClient";

export const dynamic = 'force-dynamic';

// view → API 过滤参数映射
const VIEW_FILTER: Record<string, { materialType?: string; category?: string }> = {
  bead: { materialType: "BEAD" },
  ceramic: { materialType: "CERAMIC" },
  metal: { category: "配件" },
  seal: { category: "印章" },
};

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const filter = view ? VIEW_FILTER[view] : undefined;

  // 权限检查：material.view
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  const perms: string[] = (session?.user as any)?.permissions || [];
  const showCost = canViewCost(role, perms);

  const where: any = {};
  if (filter?.materialType) {
    const types = filter.materialType.split(",").map((t) => t.trim()).filter(Boolean);
    if (types.length === 1) {
      where.materialType = types[0];
    } else if (types.length > 1) {
      where.materialType = { in: types };
    }
  }
  if (filter?.category) {
    where.category = { contains: filter.category };
  }

  const rawMaterials = await prisma.rawMaterial.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  // 非 Admin：隐藏材料单价和金额字段
  const materials = showCost
    ? rawMaterials
    : rawMaterials.map((m) => ({ ...m, unitCost: null }));

  return <MaterialsClient materials={materials} activeView={view || ""} showCost={showCost} />;
}
