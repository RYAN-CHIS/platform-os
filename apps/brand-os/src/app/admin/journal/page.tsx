"use client";
export const dynamic = 'force-dynamic'


import { useEffect, useState } from "react";
import Link from "next/link";
import { getJournalPosts, deleteJournalPost } from "@/lib/actions/admin-actions";

const categoryLabels: Record<string, string> = {
  OBJECT: "器物", MATERIAL: "材料", CRAFT: "工艺",
  DONGHAI: "东海", CREATION: "创作", PHILOSOPHY: "哲思",
};

export default function AdminJournalListPage() {
  const [posts, setPosts] = useState<any[]>([]);

  async function load() {
    const data = await getJournalPosts();
    setPosts(data);
  }
  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    if (!confirm("确定删除？")) return;
    await deleteJournalPost(id);
    await load();
  }

  const textStyle = { color: "var(--yun-text)" };
  const subStyle = { color: "var(--yun-subtext)" };
  const lineStyle = { borderColor: "var(--yun-line)" };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium tracking-[0.1em]" style={textStyle}>品牌志管理</h1>
          <p className="text-xs mt-1" style={subStyle}>{posts.length} 篇文章</p>
        </div>
        <Link href="/admin/journal/new"
          className="px-4 py-1.5 text-sm text-white rounded tracking-wider" style={{ background: "var(--yun-accent)" }}>
          新建文章
        </Link>
      </div>

      <div className="bg-white border rounded overflow-hidden" style={lineStyle}>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b" style={lineStyle}>
              <th className="py-3 px-4 font-medium" style={textStyle}>标题</th>
              <th className="py-3 px-4 font-medium" style={subStyle}>分类</th>
              <th className="py-3 px-4 font-medium" style={subStyle}>状态</th>
              <th className="py-3 px-4 font-medium" style={subStyle}>更新</th>
              <th className="py-3 px-4 font-medium text-right" style={subStyle}>操作</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id} className="border-b last:border-0" style={lineStyle}>
                <td className="py-3 px-4">
                  <Link href={`/admin/journal/${post.id}`} className="hover:underline" style={textStyle}>
                    {post.title}
                  </Link>
                </td>
                <td className="py-3 px-4" style={subStyle}>
                  {categoryLabels[post.category] || post.category}
                </td>
                <td className="py-3 px-4">
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{
                    background: post.status === "PUBLISHED" ? "rgba(99,153,34,0.1)" : "rgba(136,135,128,0.1)",
                    color: post.status === "PUBLISHED" ? "#639922" : "var(--yun-subtext)",
                  }}>{post.status === "PUBLISHED" ? "已发布" : "草稿"}</span>
                </td>
                <td className="py-3 px-4 text-xs" style={subStyle}>
                  {new Date(post.updatedAt).toLocaleDateString("zh-CN")}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <Link href={`/admin/journal/${post.id}`}
                      className="text-xs px-2 py-0.5 border rounded" style={{ ...lineStyle, color: "var(--yun-text)" }}>
                      编辑
                    </Link>
                    <button onClick={() => handleDelete(post.id)}
                      className="text-xs px-2 py-0.5 border rounded" style={{ borderColor: "#E24B4A", color: "#E24B4A" }}>
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm" style={subStyle}>暂无文章</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
