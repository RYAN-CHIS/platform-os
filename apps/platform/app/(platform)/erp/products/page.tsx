import { ProductsList } from "@/modules/erp/products";
export default function Page({ searchParams }: { searchParams: Record<string,string> }) { return <ProductsList searchParams={searchParams}/>; }
