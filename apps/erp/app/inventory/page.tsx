import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { canViewCost } from "@/lib/permissions";
import InventoryClient from "./InventoryClient";

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  const perms: string[] = (session?.user as any)?.permissions || [];
  const showCost = canViewCost(role, perms);

  const rawMaterials = await prisma.rawMaterial.findMany({ orderBy: { id: "asc" } });
  const transactions = await prisma.inventoryTransaction.findMany({
    include: { material: { select: { code: true, name: true, inventoryUnit: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // 非 Admin: 隐藏原材料单价
  const materials = showCost
    ? rawMaterials
    : rawMaterials.map((m) => ({ ...m, unitCost: null }));

  return <InventoryClient materials={materials} transactions={transactions} showCost={showCost} />;
}
