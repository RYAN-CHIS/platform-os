import { listMedia } from "@/modules/brand/media/actions";
import BrandMediaClient from "./client";

export default async function BrandMediaPage() {
  const data = await listMedia();
  return (
    <div className="max-w-7xl mx-auto p-8">
      <BrandMediaClient initialRows={data.rows as any[]} />
    </div>
  );
}
