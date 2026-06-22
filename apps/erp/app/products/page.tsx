import { prisma } from "@/lib/prisma";
import ProductsClient from "./ProductsClient";

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const [products, series, works] = await Promise.all([
    prisma.products.findMany({ include:{ skus:{ orderBy:{ code:"asc" } }, work:{ include:{ series:true } } }, orderBy:{ code:"asc" } }),
    prisma.series.findMany({ orderBy:{ sortOrder:"asc" } }),
    prisma.works.findMany({ include:{ products:true }, orderBy:{ createdAt:"desc" } }),
  ]);
  return <ProductsClient products={products} series={series} works={works} />;
}
