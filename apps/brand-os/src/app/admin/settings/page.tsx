"use client";
export const dynamic = 'force-dynamic'


import { useEffect, useState } from "react";
import {
  getSiteSettings,
  upsertSiteSetting,
  getAdminUsers,
  createAdminUser,
  deleteAdminUser,
} from "@/lib/actions/admin-actions";

const ROLE_OPTIONS = [
  { value: "SUPER_ADMIN", label: "超级管理员", desc: "全部权限" },
  { value: "ADMIN", label: "管理员", desc: "除系统设置外全部权限" },
  { value: "OPERATOR", label: "运营", desc: "线索、品牌志发布" },
  { value: "EDITOR", label: "编辑", desc: "仅品牌志内容" },
] as const;

const ROLE_MAP: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((r) => [r.value, r.label])
);

const SETTING_KEYS = [
  { key: "brand_name", label: "品牌名称" },
  { key: "brand_email", label: "邮箱" },
  { key: "brand_wechat", label: "微信" },
  { key: "brand_xiaohongshu", label: "小红书" },
  { key: "brand_weixin_mp", label: "公众号" },
  { key: "site_icp", label: "备案号" },
  { key: "site_copyright", label: "版权信息" },
];

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [newUser, setNewUser] = useState({
    email: "",
    name: "",
    password: "",
    role: "ADMIN",
  });

  useEffect(() => {
    (async () => {
      const [s, u] = await Promise.all([
        getSiteSettings(),
        getAdminUsers(),
      ]);
      const map: Record<string, string> = {};
      s.forEach((x: any) => {
        map[x.key] = x.value;
      });
      setSettings(map);
      setUsers(u);
    })();
  }, []);

  async function handleSave() {
    setLoading(true);
    for (const { key } of SETTING_KEYS) {
      if (settings[key] !== undefined) {
        await upsertSiteSetting(key, settings[key] || "");
      }
    }
    setMsg("已保存");
    setLoading(false);
    setTimeout(() => setMsg(""), 2000);
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    await createAdminUser(newUser);
    setNewUser({ email: "", name: "", password: "", role: "ADMIN" });
    const u = await getAdminUsers();
    setUsers(u);
  }

  async function handleDeleteUser(id: string) {
    if (!confirm("确定删除该管理员？")) return;
    await deleteAdminUser(id);
    const u = await getAdminUsers();
    setUsers(u);
  }

  return (
    <div>
      <h1 className="text-xl font-medium tracking-[0.1em] mb-6">
        系统设置
      </h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 品牌信息 */}
        <div className="border rounded p-4 bg-white">
          <h2 className="text-sm font-medium mb-4">品牌信息</h2>
          <div className="space-y-3">
            {SETTING_KEYS.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs mb-1 text-gray-500">
                  {label}
                </label>
                <input
                  value={settings[key] || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, [key]: e.target.value })
                  }
                  className="w-full px-3 py-1.5 border text-sm bg-white rounded"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-3 items-center">
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-1.5 text-sm text-white bg-yellow-800 rounded hover:bg-yellow-900 disabled:opacity-50"
            >
              保存
            </button>
            {msg && (
              <span className="text-xs text-green-700">{msg}</span>
            )}
          </div>
        </div>

        {/* 管理员账户 */}
        <div className="space-y-4">
          <div className="border rounded p-4 bg-white">
            <h2 className="text-sm font-medium mb-4">管理员账户</h2>
            <div className="space-y-2">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between py-1.5 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm">{u.name}</p>
                    <p className="text-xs text-gray-400">
                      {u.email} · {ROLE_MAP[u.role] || u.role}
                    </p>
                  </div>
                  {u.role !== "SUPER_ADMIN" && (
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      删除
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 新增管理员 */}
          <div className="border rounded p-4 bg-white">
            <h2 className="text-sm font-medium mb-3">新增管理员</h2>
            <form onSubmit={handleCreateUser} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs mb-0.5 text-gray-500">
                    邮箱
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    required
                    className="w-full px-3 py-1.5 border text-sm bg-white rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-0.5 text-gray-500">
                    姓名
                  </label>
                  <input
                    value={newUser.name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, name: e.target.value })
                    }
                    required
                    className="w-full px-3 py-1.5 border text-sm bg-white rounded"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs mb-0.5 text-gray-500">
                    密码
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    required
                    className="w-full px-3 py-1.5 border text-sm bg-white rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-0.5 text-gray-500">
                    角色
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value })
                    }
                    className="w-full px-3 py-1.5 border text-sm bg-white rounded"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label} — {r.desc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-1.5 text-sm text-white bg-yellow-800 rounded hover:bg-yellow-900"
              >
                创建
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
