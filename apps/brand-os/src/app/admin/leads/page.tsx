import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: '潜在线索 · 允物后台',
}

export default async function AdminLeadsPage() {
  const leads = await prisma.contactLead.findMany({
    orderBy: { createdAt: 'desc' },
  })

  const textStyle = { color: "var(--yun-text)" }
  const subStyle = { color: "var(--yun-subtext)" }
  const lineStyle = { borderColor: "var(--yun-line)" }

  return (
    <div>
      <h1 className="text-xl font-medium tracking-[0.1em] mb-6" style={textStyle}>联系线索</h1>

      {leads.length === 0 ? (
        <p className="py-24 text-center" style={subStyle}>暂无线索</p>
      ) : (
        <div className="border overflow-hidden" style={lineStyle}>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b" style={lineStyle}>
                <th className="py-3 px-4 text-xs font-medium" style={subStyle}>姓名</th>
                <th className="py-3 px-4 text-xs font-medium" style={subStyle}>微信</th>
                <th className="py-3 px-4 text-xs font-medium" style={subStyle}>邮箱</th>
                <th className="py-3 px-4 text-xs font-medium" style={subStyle}>留言</th>
                <th className="py-3 px-4 text-xs font-medium" style={subStyle}>时间</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b last:border-b-0" style={lineStyle}>
                  <td className="py-3 px-4 text-sm font-medium" style={textStyle}>{lead.name}</td>
                  <td className="py-3 px-4 text-sm" style={subStyle}>{lead.we_chat || '-'}</td>
                  <td className="py-3 px-4 text-sm" style={subStyle}>{lead.email || '-'}</td>
                  <td className="py-3 px-4 text-sm max-w-xs truncate" style={subStyle}>{lead.message || '-'}</td>
                  <td className="py-3 px-4 text-xs" style={subStyle}>
                    {new Date(lead.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
