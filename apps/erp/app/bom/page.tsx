import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { canViewCost } from "@/lib/permissions";
import BomClient from "./BomClient";

export const dynamic = 'force-dynamic';

export default async function BomPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  const perms: string[] = (session?.user as any)?.permissions || [];
  const showCost = canViewCost(role, perms);

  const list = await prisma.bom.findMany({
    include: { sku: true, material: true },
    orderBy: { id: "asc" },
  });

  const skus = await prisma.productSku.findMany({
    include: { product: { include: { work: true } } },
  });

  const materials = await prisma.rawMaterial.findMany({
    orderBy: { name: "asc" },
  });

  // 非 Admin: 剥离 BOM 材料单价
  const maskedList = showCost
    ? list
    : list.map((bom) => ({
        ...bom,
        material: { ...bom.material, unitCost: null },
        lineCost: null,
        unitPrice: null,
      }));

  // 非 Admin: 剥离材料列表中的成本
  const maskedMaterials = showCost
    ? materials
    : materials.map((m) => ({ ...m, unitCost: null }));

  return (
    <BomClient
      list={maskedList}
      skus={skus}
      materials={maskedMaterials}
      showCost={showCost}
    />
  );
}
