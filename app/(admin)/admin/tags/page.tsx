"use client";

import { useState } from "react";
import { Plus, Tag, Trash2, X, Save } from "lucide-react";
import { toast } from "sonner";

const INITIAL_TAGS = [
  { id:"1", name:"pdf",           slug:"pdf",           count:4 },
  { id:"2", name:"split",         slug:"split",         count:1 },
  { id:"3", name:"images",        slug:"images",        count:3 },
  { id:"4", name:"browser-tools", slug:"browser-tools", count:6 },
  { id:"5", name:"conversion",    slug:"conversion",    count:5 },
  { id:"6", name:"ocr",           slug:"ocr",           count:1 },
  { id:"7", name:"productivity",  slug:"productivity",  count:2 },
];

function slugify(s:string){ return s.toLowerCase().trim().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,""); }

interface TagItem { id:string; name:string; slug:string; count:number; }

export default function AdminTagsPage() {
  const [tags, setTags] = useState<TagItem[]>(INITIAL_TAGS);
  const [newTag, setNewTag] = useState("");
  const [adding, setAdding] = useState(false);

  function addTag(){
    const name = newTag.trim();
    if(!name){ toast.error("Tag name required"); return; }
    if(tags.some(t=>t.slug===slugify(name))){ toast.error("Tag already exists"); return; }
    setTags(p=>[...p,{id:Date.now().toString(),name,slug:slugify(name),count:0}]);
    setNewTag("");
    setAdding(false);
    toast.success(`Tag #${name} created`);
  }

  function deleteTag(id:string){
    setTags(p=>p.filter(t=>t.id!==id));
    toast.success("Tag deleted");
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-xl font-black text-white tracking-widest mb-1">TAGS</h1>
          <p className="text-xs font-mono text-text-muted">Manage blog post tags — used for filtering and SEO</p>
        </div>
        <button onClick={()=>setAdding(true)}
          className="btn-neon flex items-center gap-2 text-sm font-mono font-bold px-4 py-2.5">
          <Plus className="w-4 h-4"/>New Tag
        </button>
      </div>

      {/* New tag input */}
      {adding && (
        <div className="flex gap-3 mb-6 max-w-sm">
          <input value={newTag} onChange={e=>setNewTag(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&addTag()}
            placeholder="tag-name" className="input-cyber flex-1 text-sm py-2" autoFocus />
          <button onClick={addTag} className="flex items-center gap-1 px-3 py-2 text-xs font-mono rounded-lg"
            style={{background:"rgba(0,255,136,0.1)",border:"1px solid rgba(0,255,136,0.3)",color:"#00ff88"}}>
            <Save className="w-3 h-3"/>Add
          </button>
          <button onClick={()=>{setAdding(false);setNewTag("");}}
            className="p-2 text-text-muted hover:text-neon-red">
            <X className="w-4 h-4"/>
          </button>
        </div>
      )}

      {/* Tags cloud */}
      <div className="flex flex-wrap gap-2 mb-8">
        {tags.map(tag=>(
          <div key={tag.id}
            className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full group transition-all"
            style={{background:"rgba(0,245,255,0.06)",border:"1px solid rgba(0,245,255,0.15)"}}>
            <Tag className="w-3 h-3 text-neon-cyan/60"/>
            <span className="text-xs font-mono text-text-primary">#{tag.name}</span>
            <span className="text-[10px] font-mono text-text-muted">{tag.count}</span>
            <button onClick={()=>deleteTag(tag.id)}
              className="w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-neon-red">
              <X className="w-2.5 h-2.5"/>
            </button>
          </div>
        ))}
      </div>

      {/* Table view */}
      <div className="rounded-xl overflow-hidden max-w-xl" style={{border:"1px solid rgba(0,245,255,0.08)"}}>
        <div className="grid grid-cols-3 gap-4 px-5 py-2.5 text-[10px] font-mono uppercase tracking-widest text-text-muted border-b"
          style={{background:"rgba(0,245,255,0.03)",borderColor:"rgba(0,245,255,0.06)"}}>
          <div>Tag Name</div><div>Slug</div><div className="text-right">Posts / Delete</div>
        </div>
        {tags.map((tag,i)=>(
          <div key={tag.id} className="grid grid-cols-3 gap-4 px-5 py-3 items-center group border-b last:border-0"
            style={{borderColor:"rgba(0,245,255,0.05)",background:i%2===0?"rgba(10,15,30,0.6)":"rgba(13,18,36,0.5)"}}>
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-neon-cyan/50"/>
              <span className="text-xs font-mono text-text-primary">#{tag.name}</span>
            </div>
            <span className="text-xs font-mono text-text-muted">{tag.slug}</span>
            <div className="flex items-center justify-end gap-3">
              <span className="text-xs font-mono text-text-muted">{tag.count}</span>
              <button onClick={()=>deleteTag(tag.id)}
                className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-neon-red opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 className="w-3.5 h-3.5"/>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
