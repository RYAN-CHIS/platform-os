/** Isolated test — NOT inside (platform) layout */
export default function IsolatedTest() {
  return (
    <div style={{ padding: 40, background: "#e0ffe0" }}>
      <h1>ISOLATED TEST (No AdminShell)</h1>
      <p>This page does NOT use (platform) layout.</p>
      <p>If this has NO 404 content, the problem is in AdminShell/Sidebar.</p>
    </div>
  );
}
