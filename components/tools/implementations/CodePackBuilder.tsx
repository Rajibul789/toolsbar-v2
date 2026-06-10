"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PackageOpen, Plus, Trash2, FolderOpen, FileCode, ChevronRight, ChevronDown } from "lucide-react";
import { downloadBlob } from "@/lib/utils";
import { toast } from "sonner";

interface FileNode {
  id: string;
  name: string;
  content: string;
  type: "file";
  parentId: string | null;
}

interface FolderNode {
  id: string;
  name: string;
  type: "folder";
  parentId: string | null;
  isOpen: boolean;
}

type Node = FileNode | FolderNode;

const STARTER_NODES: Node[] = [
  { id: "root-src",     name: "src",           type: "folder", parentId: null,       isOpen: true },
  { id: "index-js",     name: "index.js",      type: "file",   parentId: "root-src", content: '// Entry point\nconsole.log("Hello, World!");' },
  { id: "root-readme",  name: "README.md",     type: "file",   parentId: null,       content: "# My Project\n\nA project created with ToolsBar CodePack Builder." },
];

function uid() { return Math.random().toString(36).slice(2, 9); }

export function CodePackBuilder() {
  const [nodes, setNodes] = useState<Node[]>(STARTER_NODES);
  const [selectedId, setSelectedId] = useState<string>("index-js");
  const [projectName, setProjectName] = useState("my-project");
  const [isBuilding, setIsBuilding] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["root-src"]));

  const selectedFile = nodes.find((n) => n.id === selectedId && n.type === "file") as FileNode | undefined;

  function toggleFolder(id: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function addFile(parentId: string | null) {
    const name = prompt("File name (e.g. index.js):");
    if (!name?.trim()) return;
    const node: FileNode = { id: uid(), name: name.trim(), type: "file", parentId, content: "" };
    setNodes((prev) => [...prev, node]);
    setSelectedId(node.id);
  }

  function addFolder(parentId: string | null) {
    const name = prompt("Folder name:");
    if (!name?.trim()) return;
    const node: FolderNode = { id: uid(), name: name.trim(), type: "folder", parentId, isOpen: true };
    setNodes((prev) => [...prev, node]);
    setExpandedFolders((prev) => new Set([...prev, node.id]));
  }

  function deleteNode(id: string) {
    // Collect all descendant IDs
    const toDelete = new Set<string>();
    const collect = (nodeId: string) => {
      toDelete.add(nodeId);
      nodes.filter((n) => n.parentId === nodeId).forEach((n) => collect(n.id));
    };
    collect(id);
    setNodes((prev) => prev.filter((n) => !toDelete.has(n.id)));
    if (toDelete.has(selectedId)) setSelectedId("");
  }

  function updateContent(id: string, content: string) {
    setNodes((prev) => prev.map((n) => n.id === id && n.type === "file" ? { ...n, content } : n));
  }

  async function buildZip() {
    setIsBuilding(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const root = zip.folder(projectName)!;

      function addNodeToZip(parentFolder: typeof root, parentId: string | null) {
        const children = nodes.filter((n) => n.parentId === parentId);
        for (const node of children) {
          if (node.type === "folder") {
            const folder = parentFolder.folder(node.name)!;
            addNodeToZip(folder, node.id);
          } else {
            parentFolder.file(node.name, node.content);
          }
        }
      }

      addNodeToZip(root, null);

      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      downloadBlob(blob, `${projectName}.zip`);
      toast.success("Project packaged and downloading!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to build ZIP.");
    } finally {
      setIsBuilding(false);
    }
  }

  function renderTree(parentId: string | null, depth = 0): React.ReactNode {
    const children = nodes.filter((n) => n.parentId === parentId);
    return children.map((node) => (
      <div key={node.id}>
        <div
          className="flex items-center gap-1.5 py-1 px-2 rounded cursor-pointer group transition-colors"
          style={{
            paddingLeft: `${8 + depth * 14}px`,
            background: selectedId === node.id ? "rgba(0,245,255,0.1)" : "transparent",
          }}
          onClick={() => node.type === "file" ? setSelectedId(node.id) : toggleFolder(node.id)}
        >
          {node.type === "folder" ? (
            <>
              {expandedFolders.has(node.id)
                ? <ChevronDown className="w-3 h-3 text-text-muted flex-shrink-0" />
                : <ChevronRight className="w-3 h-3 text-text-muted flex-shrink-0" />}
              <FolderOpen className="w-3.5 h-3.5 text-neon-yellow flex-shrink-0" />
            </>
          ) : (
            <>
              <span className="w-3 h-3 flex-shrink-0" />
              <FileCode className="w-3.5 h-3.5 text-neon-cyan flex-shrink-0" />
            </>
          )}

          <span className="text-xs font-mono flex-1 truncate" style={{ color: selectedId === node.id ? "#00f5ff" : "#e2e8f0" }}>
            {node.name}
          </span>

          <button
            onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-text-muted hover:text-neon-red transition-all flex-shrink-0"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

        {node.type === "folder" && expandedFolders.has(node.id) && renderTree(node.id, depth + 1)}
      </div>
    ));
  }

  const fileCount = nodes.filter((n) => n.type === "file").length;
  const folderCount = nodes.filter((n) => n.type === "folder").length;

  return (
    <div className="space-y-4">
      {/* Project name */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-1.5">Project Name</label>
          <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value.replace(/\s+/g, "-"))}
            className="input-cyber w-full text-sm" placeholder="my-project" />
        </div>
        <div className="text-right flex-shrink-0 pt-5">
          <p className="text-[11px] font-mono text-text-muted">{fileCount} files · {folderCount} folders</p>
        </div>
      </div>

      {/* IDE layout */}
      <div className="grid grid-cols-5 gap-0 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(0,245,255,0.1)", minHeight: 400 }}>
        {/* File tree */}
        <div className="col-span-2 border-r border-neon-cyan/8" style={{ background: "rgba(0,0,0,0.4)" }}>
          {/* Tree header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-neon-cyan/8">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neon-cyan/60">Explorer</span>
            <div className="flex gap-1">
              <button onClick={() => addFile(null)} className="p-1 rounded text-text-muted hover:text-neon-cyan transition-colors" title="New file">
                <Plus className="w-3 h-3" />
              </button>
              <button onClick={() => addFolder(null)} className="p-1 rounded text-text-muted hover:text-neon-yellow transition-colors" title="New folder">
                <FolderOpen className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Project root row */}
          <div className="px-2 py-1.5 border-b border-neon-cyan/5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-neon-cyan/50 uppercase tracking-widest px-2">{projectName}/</span>
              <div className="flex gap-1">
                <button onClick={() => addFile(null)} className="p-1 text-[10px] font-mono text-text-muted hover:text-neon-cyan" title="Add file to root">+f</button>
                <button onClick={() => addFolder(null)} className="p-1 text-[10px] font-mono text-text-muted hover:text-neon-yellow" title="Add folder to root">+d</button>
              </div>
            </div>
          </div>

          {/* File tree */}
          <div className="py-1 overflow-y-auto" style={{ maxHeight: 320 }}>
            {renderTree(null)}
          </div>
        </div>

        {/* Editor pane */}
        <div className="col-span-3 flex flex-col" style={{ background: "rgba(10,15,30,0.8)" }}>
          {selectedFile ? (
            <>
              {/* Editor tab */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-neon-cyan/8">
                <FileCode className="w-3.5 h-3.5 text-neon-cyan" />
                <span className="text-xs font-mono text-neon-cyan">{selectedFile.name}</span>
              </div>
              {/* Code area */}
              <textarea
                value={selectedFile.content}
                onChange={(e) => updateContent(selectedFile.id, e.target.value)}
                className="flex-1 p-4 text-xs font-mono resize-none outline-none"
                style={{
                  background: "transparent",
                  color: "#00ff88",
                  lineHeight: 1.7,
                  minHeight: 340,
                  caretColor: "#00f5ff",
                }}
                spellCheck={false}
                placeholder="// Write your code here..."
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <FileCode className="w-10 h-10 text-text-muted mx-auto mb-3" />
                <p className="text-xs font-mono text-text-muted">Select a file to edit</p>
                <p className="text-[11px] font-mono text-text-muted/60 mt-1">or create a new one with the + button</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Build button */}
      <motion.button
        onClick={buildZip}
        disabled={isBuilding || fileCount === 0}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="w-full py-3.5 flex items-center justify-center gap-2 font-mono font-bold tracking-widest text-sm rounded-lg border transition-all duration-300 disabled:opacity-50"
        style={{ background: "rgba(255,102,0,0.1)", borderColor: "rgba(255,102,0,0.5)", color: "#ff6600", textShadow: "0 0 10px rgba(255,102,0,0.6)" }}
      >
        {isBuilding ? (
          <motion.div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
        ) : (
          <PackageOpen className="w-4 h-4" />
        )}
        {isBuilding ? "PACKAGING..." : `DOWNLOAD ${projectName}.zip`}
      </motion.button>
    </div>
  );
}