"use client";

import { motion, AnimatePresence } from "framer-motion";
import { History, Trash2, Clock, ExternalLink } from "lucide-react";
import * as LucideIcons from "lucide-react";
import Link from "next/link";
import { useToolsStore } from "@/stores/toolsStore";
import { TOOLS_CONFIG, NEON_COLOR_MAP } from "@/config/tools.config";
import { formatDateRelative } from "@/lib/utils";

function getIcon(name: string) {
  const icons = LucideIcons as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;
  return icons[name] ?? icons["Wrench"];
}

export function DownloadHistory() {
  const { recentTools, clearHistory } = useToolsStore();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-neon-cyan/60" />
          <span className="text-xs font-mono text-text-muted uppercase tracking-widest">Recent Activity</span>
        </div>
        {recentTools.length > 0 && (
          <button onClick={clearHistory} className="flex items-center gap-1 text-[11px] font-mono text-text-muted hover:text-neon-red transition-colors">
            <Trash2 className="w-3 h-3" />Clear
          </button>
        )}
      </div>

      <AnimatePresence>
        {recentTools.length === 0 ? (
          <motion.div initial={{opacity:0}} animate={{opacity:1}}
            className="rounded-xl p-8 text-center"
            style={{background:"rgba(0,245,255,0.02)",border:"1px dashed rgba(0,245,255,0.1)"}}>
            <History className="w-8 h-8 text-text-muted mx-auto mb-3 opacity-40"/>
            <p className="text-xs font-mono text-text-muted">No recent tool usage yet.</p>
          </motion.div>
        ) : (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-2">
            {recentTools.map((recent, i) => {
              const tool = TOOLS_CONFIG.find(t=>t.slug===recent.slug);
              if (!tool) return null;
              const Icon = getIcon(tool.icon);
              const color = NEON_COLOR_MAP[tool.accentColor];
              return (
                <motion.div key={`${recent.slug}-${i}`} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*0.05}}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl group transition-all"
                  style={{background:"rgba(10,15,30,0.8)",border:"1px solid rgba(0,245,255,0.06)"}}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{background:`${color}10`,border:`1px solid ${color}20`}}>
                    <Icon className="w-4 h-4" style={{color}}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-text-primary group-hover:text-neon-cyan transition-colors truncate">{tool.name}</p>
                    <div className="flex items-center gap-1 text-[11px] font-mono text-text-muted">
                      <Clock className="w-2.5 h-2.5"/>
                      {formatDateRelative(new Date(recent.usedAt))}
                    </div>
                  </div>
                  <Link href={`/tools/${tool.slug}`}
                    className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-neon-cyan border border-transparent hover:border-neon-cyan/20 transition-all opacity-0 group-hover:opacity-100">
                    <ExternalLink className="w-3.5 h-3.5"/>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
