"use client";

import { useState } from "react";
import { Card } from "@yunwu/ui";
import { saveSiteSetting } from "@/modules/brand/settings/actions";

export default function BrandSettingsClient({ initialSections }: { initialSections: any[] }) {
  const [sections, setSections] = useState(initialSections);
  const [editing, setEditing] = useState<Record<string, string>>({}); // key -> temp value
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{message:string;type:string}|null>(null);

  const handleSave = async (key: string) => {
    const value = editing[key] ?? "";
    setSaving(prev => ({ ...prev, [key]: true }));
    const r = await saveSiteSetting(key, value);
    setSaving(prev => ({ ...prev, [key]: false }));
    if (r.error) { setToast({ message: r.error, type: "error" }); return; }
    // Update local state
    setSections((prev: any[]) => prev.map(s => ({
      ...s, fields: s.fields.map((f: any) => f.key === key ? { ...f, value } : f)
    })));
    setEditing(prev => { const n = { ...prev }; delete n[key]; return n; });
    setToast({ message: "已保存", type: "success" });
  };

  return (
    <div>
      {toast && <div style={{position:"fixed",top:16,right:16,background:toast.type==="error"?"#fee2e2":"#dcfce7",padding:"8px 16px",borderRadius:8,zIndex:100,cursor:"pointer"}} onClick={()=>setToast(null)}>{toast.message}</div>}

      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:24,fontWeight:300,letterSpacing:"0.1em",color:"#292524"}}>站点设置</h1>
        <p style={{fontSize:12,color:"#a8a29e",marginTop:4}}>品牌基础信息 · 社交媒体 · Footer · 法务</p>
      </div>

      <div style={{display:"grid",gap:24}}>
        {sections.map((section: any) => (
          <Card key={section.key} padding="lg">
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
              <span style={{fontSize:20}}>{section.icon}</span>
              <h3 style={{fontSize:16,fontWeight:500}}>{section.label}</h3>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {section.fields.map((field: any) => {
                const isEditing = field.key in editing;
                const currentValue = isEditing ? editing[field.key] : field.value;
                const changed = isEditing && editing[field.key] !== field.value;
                
                return (
                  <div key={field.key} style={{display:"flex",alignItems:"flex-start",gap:12}}>
                    <label style={{width:120,fontSize:13,color:"#78716c",paddingTop:6,flexShrink:0}}>{field.label}</label>
                    <div style={{flex:1}}>
                      {field.type === "textarea" ? (
                        <textarea
                          rows={3}
                          value={currentValue}
                          onChange={e => setEditing(prev => ({ ...prev, [field.key]: e.target.value }))}
                          onFocus={() => !(field.key in editing) && setEditing(prev => ({ ...prev, [field.key]: field.value }))}
                          style={{width:"100%",padding:"6px 10px",border:changed?"2px solid #f59e0b":"1px solid #e7e5e4",borderRadius:4,fontSize:13,resize:"vertical"}}
                        />
                      ) : (
                        <input
                          type={field.type === "email" ? "email" : field.type === "tel" ? "tel" : "text"}
                          value={currentValue}
                          onChange={e => setEditing(prev => ({ ...prev, [field.key]: e.target.value }))}
                          onFocus={() => !(field.key in editing) && setEditing(prev => ({ ...prev, [field.key]: field.value }))}
                          style={{width:"100%",padding:"6px 10px",border:changed?"2px solid #f59e0b":"1px solid #e7e5e4",borderRadius:4,fontSize:13}}
                        />
                      )}
                    </div>
                    <button
                      onClick={() => handleSave(field.key)}
                      disabled={saving[field.key] || !changed}
                      style={{
                        padding:"6px 12px",borderRadius:4,border:"none",cursor:saving[field.key]||!changed?"default":"pointer",
                        background:changed?"#292524":"#e7e5e4",color:changed?"#fff":"#a8a29e",fontSize:12,opacity:saving[field.key]?0.6:1,flexShrink:0
                      }}
                    >
                      {saving[field.key] ? "..." : "保存"}
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
