import { validatePreviewToken, getPreviewContent } from "@/lib/publisher";

export default async function PreviewProduct({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const token = (await searchParams).token || "";
  const validation = await validatePreviewToken(token);

  if (!validation.valid) {
    return (
      <div style={{ padding: 60, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ fontSize: 24, color: "#dc2626", marginBottom: 8 }}>预览链接无效或已过期</h1>
        <p style={{ color: "#78716c", fontSize: 14 }}>请联系管理员重新生成预览链接。</p>
      </div>
    );
  }

  const content = await getPreviewContent("products", id);

  if (!content) {
    return (
      <div style={{ padding: 60, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ fontSize: 24, color: "#78716c", marginBottom: 8 }}>产品不存在</h1>
        <p style={{ color: "#a8a29e", fontSize: 14 }}>该产品可能已被删除或 ID 无效。</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 40, maxWidth: 800, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 32, marginBottom: 16 }}>
        🔍 预览：{content.name as string}
      </h1>
      <div style={{ background: "#f0f0f0", padding: 16, borderRadius: 8 }}>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6 }}>
          {JSON.stringify(content, null, 2)}
        </pre>
      </div>
      <p style={{ color: "#999", marginTop: 16, fontSize: 12 }}>
        这是内部预览，只有拥有有效链接的人才能看到。正式页面不受影响。
      </p>
    </div>
  );
}
