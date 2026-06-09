"use client";
import { useState } from "react";
import { Star, Eye, EyeOff, ArrowUp, ArrowDown, Plus } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface FeaturedPost { id:string; title:string; slug:string; category:string; date:string; isActive:boolean; order:number; }

const INITIAL:FeaturedPost[] = [
  { id:"1", title:"How to Split a PDF Online for Free", slug:"how-to-split-pdf-online-free", category:"PDF Tools", date:"Jan 15, 2025", isActive:true, order:1 },
  { id:"2", title:"Compress Images Without Losing Quality", slug:"compress-images-without-losing-quality", category:"Image Tools", date:"Jan 12, 2025", isActive:true, order:2 },
];

export default function FeaturedBlogPage() {
  const [items, setItems] = useState<FeaturedPost[]>(INITIAL);

  function toggle(id:string){ setItems(p=>p.map(i=>i.id===id?{...i,isActive:!i.isActive}:i)); toast.success("Updated"); }
  function move(id:string, dir:"up"|"down"){
    setItems(prev=>{
      const arr=[...prev].sort((a,b)=>a.order-b.order);
      const idx=arr.findIndex(i=>i.id===id); const swap=dir==="up"?idx-1:idx+1;
      if(swap<0||swap>=arr.length) return prev;
      [arr[idx].order,arr[swap].order]=[arr[swap].order,arr[idx].order];
      return [...arr];
    });
  }
  const sorted=[...items].sort((a,b)=>a.order-b.order);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-black text-white tracking-widest mb-1">FEATURED BLOG POSTS</h1>
          <p className="text-xs font-mono text-text-muted">Control which posts are highlighted on the blog listing page</p>
        </div>
        <Link href="/admin/blog/new" className="btn-neon flex items-center gap-2 text-sm font-mono font-bold px-4 py-2.5">
          <Plus className="w-4 h-4"/>New Post
        </Link>
      </div>
      <div className="rounded-xl px-5 py-4 mb-6" style={{background:"rgba(0,245,255,0.04)",border:"1px solid rgba(0,245,255,0.1)"}}>
        <p className="text-xs font-mono text-text-muted"><span className="text-neon-cyan">ℹ</span>{" "}Featured posts appear at the top of the blog with a FEATURED badge. Reorder with arrows, toggle visibility with the eye icon.</p>
      </div>
      <div className="space-y-2 max-w-3xl">
        <AnimatePresence>
          {sorted.map(item=>(
            <motion.div key={item.id} layout
              className="flex items-center gap-4 px-5 py-4 rounded-xl"
              style={{background:item.isActive?"rgba(10,15,30,0.8)":"rgba(10,15,30,0.4)",border:`1px solid ${item.isActive?"rgba(0,245,255,0.12)":"rgba(0,245,255,0.04)"}`,opacity:item.isActive?1:0.6}}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold" style={{background:"rgba(0,245,255,0.08)",border:"1px solid rgba(0,245,255,0.15)",color:"#00f5ff"}}>{item.order}</div>
              <Star className="w-4 h-4 flex-shrink-0 text-neon-yellow" style={{fill:"#ffcc00"}}/>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono text-text-primary truncate">{item.title}</p>
                <p className="text-[11px] font-mono text-text-muted">{item.category} · {item.date}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={()=>move(item.id,"up")} className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-neon-cyan transition-all"><ArrowUp className="w-3.5 h-3.5"/></button>
                <button onClick={()=>move(item.id,"down")} className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-neon-cyan transition-all"><ArrowDown className="w-3.5 h-3.5"/></button>
                <button onClick={()=>toggle(item.id)} className="w-7 h-7 rounded flex items-center justify-center transition-all" style={{background:item.isActive?"rgba(0,245,255,0.08)":"rgba(71,85,105,0.1)",border:`1px solid ${item.isActive?"rgba(0,245,255,0.2)":"rgba(71,85,105,0.2)"}`,color:item.isActive?"#00f5ff":"#475569"}}>
                  {item.isActive?<Eye className="w-3.5 h-3.5"/>:<EyeOff className="w-3.5 h-3.5"/>}
                </button>
                <Link href={`/admin/blog/${item.id}`} className="px-3 py-1.5 text-[11px] font-mono rounded border border-neon-cyan/15 text-text-muted hover:text-neon-cyan transition-all">Edit</Link>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
