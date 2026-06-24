"use client";

import { useState, useEffect } from "react";
import { listBanners, createBanner, updateBanner, deleteBanner, moveBanner, publishBanner, unpublishBanner } from "@/modules/brand/banners/actions";

// Status badge colors
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#78716c", PUBLISHED: "#16a34a", SCHEDULED: "#9333ea", ARCHIVED: "#57534e"
};

export default function BrandBannersClient({ initialData }: { initialData: { rows: any[]; total: number; error: string | null } }) {
  const [rows, setRows] = useState(initialData.rows || []);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [toast, setToast] = useState<{message:string;type:string}|null>(null);

  // Form state
  const [form, setForm] = useState({ title: "", image_url: "", link_url: "", position: "home", sort_order: 0, status: "DRAFT", start_at: "", end_at: "" });

  const refresh = async () => {
    setLoading(true);
    const r = await listBanners();
    if (r.error) setToast({ message: r.error, type: "error" });
    else setRows(r.rows);
    setLoading(false);
  };

  const openCreate = () => { setEditRow(null); setForm({ title:"", image_url:"", link_url:"", position:"home", sort_order:0, status:"DRAFT", start_at:"", end_at:"" }); setModalOpen(true); };
  const openEdit = (row: any) => { setEditRow(row); setForm({ title:row.title, image_url:row.image_url||"", link_url:row.link_url||"", position:row.position||"home", sort_order:row.sort_order||0, status:row.status||"DRAFT", start_at:row.start_at||"", end_at:row.end_at||"" }); setModalOpen(true); };

  const handleSave = async () => {
    setLoading(true);
    const r = editRow ? await updateBanner(editRow.id, form) : await createBanner(form);
    setLoading(false);
    if (r.error) { setToast({ message: r.error, type: "error" }); return; }
    setModalOpen(false);
    refresh();
    setToast({ message: editRow ? "已更新" : "已创建", type: "success" });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除？")) return;
    setLoading(true);
    const r = await deleteBanner(id);
    setLoading(false);
    if (r.error) setToast({ message: r.error, type: "error" });
    else { setToast({ message: "已删除", type: "success" }); refresh(); }
  };

  const handleMove = async (id: number, dir: "up"|"down") => {
    const r = await moveBanner(id, dir);
    if (r.error) setToast({ message: r.error, type: "error" });
    else refresh();
  };

  return (
    <div>
      {toast && <div style={{position:"fixed",top:16,right:16,background:toast.type==="error"?"#fee2e2":"#dcfce7",padding:"8px 16px",borderRadius:8,zIndex:100}} onClick={()=>setToast(null)}>{toast.message}</div>}

      {/* Top bar */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:300,letterSpacing:"0.1em",color:"#292524"}}>Banner 管理</h1>
          <p style={{fontSize:12,color:"#a8a29e",marginTop:4}}>共 {rows.length} 条</p>
        </div>
        <button onClick={openCreate} style={{padding:"8px 20px",background:"#292524",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:14}}>+ 新增 Banner</button>
      </div>

      {/* Banner list as cards */}
      {rows.length === 0 ? (
        <div style={{background:"#fff",border:"1px solid #e7e5e4",borderRadius:8,padding:24}}><div style={{textAlign:"center",color:"#a8a29e",padding:40}}>暂无 Banner，点击右上角新增</div></div>
      ) : (
        <div style={{display:"grid",gap:16}}>
          {rows.map((row: any) => (
            <div key={row.id} style={{background:"#fff",border:"1px solid #e7e5e4",borderRadius:8,padding:16,display:"flex",gap:16,alignItems:"center"}}>
              {row.image_url && <img src={row.image_url} alt={row.title} style={{width:120,height:60,objectFit:"cover",borderRadius:4}} />}
              <div style={{flex:1}}>
                <div style={{fontWeight:500}}>{row.title}</div>
                <div style={{fontSize:12,color:"#a8a29e"}}>{row.position} · 排序: {row.sort_order}</div>
                {row.link_url && <div style={{fontSize:11,color:"#78716c"}}>{row.link_url}</div>}
              </div>
              <span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:STATUS_COLORS[row.status]||"#e7e5e4",color:row.status==="DRAFT"?"#57534e":"#fff"}}>{row.status}</span>
              <div style={{display:"flex",gap:4}}>
                <button onClick={()=>handleMove(row.id,"up")} style={{padding:"4px 8px",border:"1px solid #e7e5e4",borderRadius:4,background:"#fff",cursor:"pointer",fontSize:12}}>↑</button>
                <button onClick={()=>handleMove(row.id,"down")} style={{padding:"4px 8px",border:"1px solid #e7e5e4",borderRadius:4,background:"#fff",cursor:"pointer",fontSize:12}}>↓</button>
                <button onClick={()=>openEdit(row)} style={{padding:"4px 8px",border:"1px solid #e7e5e4",borderRadius:4,background:"#fff",cursor:"pointer",fontSize:12}}>编辑</button>
                {row.status === "DRAFT" && <button onClick={async()=>{await publishBanner(row.id);refresh();}} style={{padding:"4px 8px",border:"1px solid #16a34a",color:"#16a34a",borderRadius:4,background:"#fff",cursor:"pointer",fontSize:12}}>发布</button>}
                {row.status === "PUBLISHED" && <button onClick={async()=>{await unpublishBanner(row.id);refresh();}} style={{padding:"4px 8px",border:"1px solid #d97706",color:"#d97706",borderRadius:4,background:"#fff",cursor:"pointer",fontSize:12}}>下架</button>}
                <button onClick={()=>handleDelete(row.id)} style={{padding:"4px 8px",border:"1px solid #ef4444",color:"#ef4444",borderRadius:4,background:"#fff",cursor:"pointer",fontSize:12}}>删除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:"#fff",borderRadius:8,width:520,maxHeight:"80vh",overflow:"auto",padding:24}}>
            <h3 style={{marginBottom:16}}>{editRow ? "编辑" : "新增"} Banner</h3>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <label style={{fontSize:12,color:"#78716c"}}>标题 <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} style={{display:"block",width:"100%",marginTop:4,padding:"6px 10px",border:"1px solid #e7e5e4",borderRadius:4}} /></label>
              <label style={{fontSize:12,color:"#78716c"}}>图片URL <input value={form.image_url} onChange={e=>setForm({...form,image_url:e.target.value})} style={{display:"block",width:"100%",marginTop:4,padding:"6px 10px",border:"1px solid #e7e5e4",borderRadius:4}} /></label>
              <label style={{fontSize:12,color:"#78716c"}}>链接URL <input value={form.link_url} onChange={e=>setForm({...form,link_url:e.target.value})} style={{display:"block",width:"100%",marginTop:4,padding:"6px 10px",border:"1px solid #e7e5e4",borderRadius:4}} /></label>
              <div style={{display:"flex",gap:12}}>
                <label style={{fontSize:12,color:"#78716c",flex:1}}>位置 <select value={form.position} onChange={e=>setForm({...form,position:e.target.value})} style={{display:"block",width:"100%",marginTop:4,padding:"6px 10px",border:"1px solid #e7e5e4",borderRadius:4}}><option value="home">首页</option><option value="product">产品页</option><option value="series">系列页</option></select></label>
                <label style={{fontSize:12,color:"#78716c",flex:1}}>状态 <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} style={{display:"block",width:"100%",marginTop:4,padding:"6px 10px",border:"1px solid #e7e5e4",borderRadius:4}}><option value="DRAFT">草稿</option><option value="PUBLISHED">已发布</option><option value="ARCHIVED">已归档</option></select></label>
                <label style={{fontSize:12,color:"#78716c",flex:1}}>排序 <input type="number" value={form.sort_order} onChange={e=>setForm({...form,sort_order:parseInt(e.target.value)||0})} style={{display:"block",width:"100%",marginTop:4,padding:"6px 10px",border:"1px solid #e7e5e4",borderRadius:4}} /></label>
              </div>
              <div style={{display:"flex",gap:12}}>
                <label style={{fontSize:12,color:"#78716c",flex:1}}>上线时间 <input type="datetime-local" value={form.start_at} onChange={e=>setForm({...form,start_at:e.target.value})} style={{display:"block",width:"100%",marginTop:4,padding:"6px 10px",border:"1px solid #e7e5e4",borderRadius:4}} /></label>
                <label style={{fontSize:12,color:"#78716c",flex:1}}>下线时间 <input type="datetime-local" value={form.end_at} onChange={e=>setForm({...form,end_at:e.target.value})} style={{display:"block",width:"100%",marginTop:4,padding:"6px 10px",border:"1px solid #e7e5e4",borderRadius:4}} /></label>
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:20,justifyContent:"flex-end"}}>
              <button onClick={()=>setModalOpen(false)} style={{padding:"8px 16px",border:"1px solid #e7e5e4",borderRadius:6,background:"#fff",cursor:"pointer"}}>取消</button>
              <button onClick={handleSave} disabled={loading} style={{padding:"8px 16px",background:"#292524",color:"#fff",border:"none",borderRadius:6,cursor:"pointer"}}>{loading?"保存中...":"保存"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
