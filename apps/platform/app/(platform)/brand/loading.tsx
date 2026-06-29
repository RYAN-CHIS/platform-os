const skeletonRows = Array.from({ length: 6 }, (_, index) => index);

export default function BrandLoading() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ width: 180, height: 24, borderRadius: 6, background: "#e7e5e4", marginBottom: 10 }} />
          <div style={{ width: 260, height: 12, borderRadius: 6, background: "#f5f5f4" }} />
        </div>
        <div style={{ width: 104, height: 34, borderRadius: 8, background: "#e7e5e4" }} />
      </div>

      <div style={{
        border: "1px solid #e7e5e4",
        borderRadius: 10,
        overflow: "hidden",
        background: "#fff",
      }}>
        <div style={{ height: 42, background: "#fafaf9", borderBottom: "1px solid #e7e5e4" }} />
        {skeletonRows.map((row) => (
          <div
            key={row}
            style={{
              display: "grid",
              gridTemplateColumns: "72px 1fr 120px 140px",
              gap: 16,
              alignItems: "center",
              padding: "14px 18px",
              borderBottom: row === skeletonRows.length - 1 ? "none" : "1px solid #f5f5f4",
            }}
          >
            <div style={{ height: 14, borderRadius: 6, background: "#f5f5f4" }} />
            <div style={{ height: 16, borderRadius: 6, background: "#e7e5e4" }} />
            <div style={{ height: 14, borderRadius: 6, background: "#f5f5f4" }} />
            <div style={{ height: 24, borderRadius: 6, background: "#f5f5f4" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
