"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, FolderOpen, Save, X } from "lucide-react";
import { toast } from "sonner";

const INITIAL_CATS = [
  { id: "1", name: "PDF Tools",       slug: "pdf-tools",       color: "#00f5ff", count: 3 },
  { id: "2", name: "Image Tools",     slug: "image-tools",     color: "#bf00ff", count: 2 },
  { id: "3", name: "Text Tools",      slug: "text-tools",      color: "#00ff88", count: 1 },
  { id: "4", name: "Social Tools",    slug: "social-tools",    color: "#ff00aa", count: 0 },
  { id: "5", name: "Developer Tools", slug: "developer-tools", color: "#ff6600", count: 0 },
];

const COLORS = ["#00f5ff","#00ff88","#bf00ff","#ff6600","#ff00aa","#ffcc00","#ff003c","#0066ff"];

interface Cat { id: string; name: string; slug: string; color: string; count: number; }

function slugify(s: string) { return s.toLowerCase().trim().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,""); }

export default function AdminCategoriesPage() {
  const [cats, setCats] = useState<Cat[]>(INITIAL_CATS);
  const [editing, setEditing] = useState<string|null>(null);
  const [adding, setAdding]   = useState(false);
  const [form, setForm]       = useState({ name:"", slug:"", color:"#00f5ff" });

  function nameChange(name:string){ setForm(f=>({...f,name,slug:slugify(name)})); }
  function cancel(){ setEditing(null); setAdding(false); setForm({name:"",slug:"",color:"#00f5ff"}); }

  function saveNew(){
    if(!form.name.trim()){ toast.error("Name required"); return; }
    setCats(p=>[...p,{id:Date.now().toString(),...form,count:0}]);
    cancel(); toast.success("Category created");
  }

  function saveEdit(id:string){
    if(!form.name.trim()){ toast.error("Name required"); return; }
    setCats(p=>p.map(c=>c.id===id?{...c,...form}:c));
    cancel(); toast.success("Updated");
  }

  const Row = ({onSave}:{onSave:()=>void}) => (
    <div className="flex flex-wrap gap-3 px-4 py-3 rounded-xl items-center"
      style={{background:"rgba(0,245,255,0.05)",border:"1px solid rgba(0,245,255,0.2)"}}>
      <input value={form.name} onChange={e=>nameChange(e.target.value)}
        placeholder="Category name" className="input-cyber text-sm py-2 w-40 flex-shrink-0" autoFocus />
      <input value={form.slug} onChange={e=>setForm(f=>({...f,slug:e.target.value}))}
        placeholder="url-slug" className="input-cyber text-sm py-2 font-mono w-36 flex-shrink-0" />
      <div className="flex gap-1.5">{COLORS.map(c=>(
        <button key={c} onClick={()=>setForm(f=>({...f,color:c}))}
          className="w-5 h-5 rounded-full border-2 hover:scale-110 transition-transform"
          style={{background:c,borderColor:form.color===c?"#fff":"transparent"}}/>
      ))}</div>
      <button onClick={onSave} className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono rounded-lg"
        style={{background:"rgba(0,255,136,0.1)",border:"1px solid rgba(0,255,136,0.3)",color:"#00ff88"}}>
        <Save className="w-3 h-3"/>Save
      </button>
      <button onClick={cancel} className="p-1.5 text-text-muted hover:text-neon-red">
        <X className="w-3.5 h-3.5"/>
      </button>
    </div>
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-xl font-black text-white tracking-widest mb-1">CATEGORIES</h1>
          <p className="text-xs font-mono text-text-muted">Manage blog post categories</p>
        </div>
        <button onClick={()=>{setAdding(true);setEditing(null);setForm({name:"",slug:"",color:"#00f5ff"});}}
          className="btn-neon flex items-center gap-2 text-sm font-mono font-bold px-4 py-2.5">
          <Plus className="w-4 h-4"/>New Category
        </button>
      </div>

      <div className="space-y-2 max-w-3xl">
        {adding && <Row onSave={saveNew}/>}
        {cats.map(cat=>(
          <div key={cat.id}>
            {editing===cat.id ? <Row onSave={()=>saveEdit(cat.id)}/> : (
              <div className="flex items-center gap-4 px-4 py-3.5 rounded-xl group transition-all"
                style={{background:"rgba(10,15,30,0.8)",border:"1px solid rgba(0,245,255,0.06)"}}>
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{background:cat.color,boxShadow:`0 0 6px ${cat.color}60`}}/>
                <FolderOpen className="w-4 h-4 flex-shrink-0" style={{color:cat.color}}/>
                <span className="text-sm font-mono text-text-primary flex-1">{cat.name}</span>
                <span className="text-xs font-mono text-text-muted hidden sm:block w-40">{cat.slug}</span>
                <span className="text-xs font-mono text-text-muted w-12 text-center">{cat.count} posts</span>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={()=>{setEditing(cat.id);setAdding(false);setForm({name:cat.name,slug:cat.slug,color:cat.color});}}
                    className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-neon-cyan transition-colors">
                    <Pencil className="w-3.5 h-3.5"/>
                  </button>
                  <button onClick={()=>{setCats(p=>p.filter(c=>c.id!==cat.id));toast.success("Deleted");}}
                    className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-neon-red transition-colors">
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
