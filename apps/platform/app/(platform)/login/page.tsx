import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm p-8 rounded-2xl bg-gray-900 border border-gray-800">
        <h1 className="text-2xl font-bold text-center text-amber-400 mb-6">允物 Platform OS</h1>
        <p className="text-center text-gray-400 mb-8">请登录以继续</p>
        {/* TODO: 接入真实登录表单 */}
        <div className="text-center text-sm text-gray-500">
          登录功能待接入
        </div>
      </div>
    </div>
  );
}
