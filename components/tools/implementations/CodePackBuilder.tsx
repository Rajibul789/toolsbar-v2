"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PackageOpen, Plus, Trash2, FolderOpen, FileCode, ChevronRight, ChevronDown, FilePlus, FolderPlus, ClipboardPaste, Hammer, FileWarning, Pencil } from "lucide-react";
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

interface ParsedArchitecture {
  projectName: string;
  nodes: Node[];
}

/**
 * Parses a pasted ASCII project tree (the standard `tree`-command style:
 * "├── " / "└── " / "│   " prefixes, folders marked with a trailing "/")
 * into the same Node[] shape Mode 1 already uses - so rendering, editing,
 * and zipping are fully shared, not duplicated for Mode 2.
 *
 * Depth is derived by comparing each line's prefix *length* against a
 * stack of currently-open ancestor folders, not by assuming a fixed
 * character width per level. That means this generalizes to any
 * consistently-indented tree notation, not just the specific width used
 * in any one example.
 */
function parseArchitecture(text: string): ParsedArchitecture {
  const lines = text
    .split("\n")
    .map((l) => l.replace(/\r$/, ""))
    .filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    throw new Error("Paste a project architecture first.");
  }

  const looksLikeEntry = (l: string) => l.includes("├──") || l.includes("└──");
  const hasRootLine = !looksLikeEntry(lines[0]);
  const projectName = hasRootLine ? lines[0].trim().replace(/\/+$/, "") || "my-project" : "my-project";
  const startIdx = hasRootLine ? 1 : 0;

  const newNodes: Node[] = [];
  const stack: { prefixLength: number; id: string }[] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    const idx = Math.max(line.lastIndexOf("├──"), line.lastIndexOf("└──"));
    if (idx === -1) {
      throw new Error(`Line ${i + 1} doesn't look like a valid tree entry: "${line.trim()}"`);
    }

    const prefixLength = idx;
    const rawName = line.slice(idx + 3).trim();
    if (!rawName) {
      throw new Error(`Line ${i + 1} has no file or folder name.`);
    }

    const isFolder = rawName.endsWith("/");
    const name = isFolder ? rawName.slice(0, -1) : rawName;
    if (!name || name.includes("/")) {
      throw new Error(`"${rawName}" on line ${i + 1} isn't a valid file or folder name.`);
    }

    while (stack.length > 0 && stack[stack.length - 1].prefixLength >= prefixLength) {
      stack.pop();
    }
    const parentId = stack.length > 0 ? stack[stack.length - 1].id : null;

    if (newNodes.some((n) => n.parentId === parentId && n.name === name)) {
      throw new Error(`Duplicate name "${name}" under the same folder (line ${i + 1}).`);
    }

    const id = uid();
    if (isFolder) {
      newNodes.push({ id, name, type: "folder", parentId, isOpen: true });
      stack.push({ prefixLength, id });
    } else {
      newNodes.push({ id, name, type: "file", parentId, content: "" });
    }
  }

  if (newNodes.length === 0) {
    throw new Error("No files or folders were found in the pasted architecture.");
  }

  return { projectName, nodes: newNodes };
}

/** Full slash-separated path for a node, rooted at projectName - used to
 *  validate the generated ZIP actually contains everything expected
 *  before declaring the download a success. */
function getFullPath(node: Node, allNodes: Node[], projectName: string): string {
  const parts: string[] = [node.name];
  let current: Node | undefined = node;
  while (current?.parentId) {
    const parent = allNodes.find((n) => n.id === current!.parentId);
    if (!parent) break;
    parts.unshift(parent.name);
    current = parent;
  }
  return [projectName, ...parts].join("/");
}

export function CodePackBuilder() {
  const [nodes, setNodes] = useState<Node[]>(STARTER_NODES);
  const [selectedId, setSelectedId] = useState<string>("index-js");
  const [projectName, setProjectName] = useState("my-project");
  const [isBuilding, setIsBuilding] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["root-src"]));
  const [mode, setMode] = useState<"build" | "paste">("build");
  const [pasteText, setPasteText] = useState("");
  const [pasteGenerated, setPasteGenerated] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

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
    const trimmed = name.trim();
    if (nodes.some((n) => n.parentId === parentId && n.name === trimmed)) {
      toast.error(`"${trimmed}" already exists in this folder.`);
      return;
    }
    const node: FileNode = { id: uid(), name: trimmed, type: "file", parentId, content: "" };
    setNodes((prev) => [...prev, node]);
    setSelectedId(node.id);
    if (parentId) setExpandedFolders((prev) => new Set([...prev, parentId]));
  }

  function addFolder(parentId: string | null) {
    const name = prompt("Folder name:");
    if (!name?.trim()) return;
    const trimmed = name.trim();
    if (nodes.some((n) => n.parentId === parentId && n.name === trimmed)) {
      toast.error(`"${trimmed}" already exists in this folder.`);
      return;
    }
    const node: FolderNode = { id: uid(), name: trimmed, type: "folder", parentId, isOpen: true };
    setNodes((prev) => [...prev, node]);
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.add(node.id);
      if (parentId) next.add(parentId);
      return next;
    });
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

  function renameNode(id: string) {
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    const name = prompt(`Rename "${node.name}" to:`, node.name);
    if (!name?.trim() || name.trim() === node.name) return;
    const trimmed = name.trim();
    if (nodes.some((n) => n.parentId === node.parentId && n.id !== id && n.name === trimmed)) {
      toast.error(`"${trimmed}" already exists in this folder.`);
      return;
    }
    // Only the name field changes - parentId (and therefore the whole
    // hierarchy) is untouched, so this preserves the tree structure by
    // construction rather than needing separate hierarchy-preserving logic.
    setNodes((prev) => prev.map((n) => n.id === id ? { ...n, name: trimmed } : n));
  }

  function updateContent(id: string, content: string) {
    setNodes((prev) => prev.map((n) => n.id === id && n.type === "file" ? { ...n, content } : n));
  }

  function handleGenerateFromPaste() {
    setParseError(null);
    try {
      const result = parseArchitecture(pasteText);
      setNodes(result.nodes);
      setProjectName(result.projectName);
      const firstFile = result.nodes.find((n) => n.type === "file");
      setSelectedId(firstFile?.id ?? "");
      // Expand every generated folder so the whole tree is visible right away.
      setExpandedFolders(new Set(result.nodes.filter((n) => n.type === "folder").map((n) => n.id)));
      setPasteGenerated(true);
      toast.success(`Generated ${result.nodes.length} item(s) from your architecture.`);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Couldn't parse that architecture.");
    }
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

      // Validate the generated ZIP actually contains everything before
      // declaring success - never report a working download without
      // confirming the structure genuinely matches.
      const expectedPaths = nodes.map((n) => getFullPath(n, nodes, projectName));
      const reloaded = await JSZip.loadAsync(blob);
      const actualPaths = new Set(Object.keys(reloaded.files).map((p) => p.replace(/\/$/, "")));
      const missing = expectedPaths.filter((p) => !actualPaths.has(p));
      if (missing.length > 0) {
        throw new Error(`ZIP is missing ${missing.length} item(s), including "${missing[0]}". Please try again.`);
      }

      downloadBlob(blob, `${projectName}.zip`);
      toast.success("Project packaged and downloading!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to build ZIP.");
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

          {node.type === "folder" && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); addFile(node.id); }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-text-muted hover:text-neon-cyan transition-all flex-shrink-0"
                title="New file here"
              >
                <FilePlus className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); addFolder(node.id); }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-text-muted hover:text-neon-yellow transition-all flex-shrink-0"
                title="New folder here"
              >
                <FolderPlus className="w-3 h-3" />
              </button>
            </>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); renameNode(node.id); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-text-muted hover:text-neon-cyan transition-all flex-shrink-0"
            title="Rename"
          >
            <Pencil className="w-3 h-3" />
          </button>
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
      {/* Mode switcher */}
      <div className="flex gap-2 p-1 rounded-lg" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(0,245,255,0.1)" }}>
        <button
          onClick={() => setMode("build")}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-mono font-bold tracking-wide transition-all"
          style={{ background: mode === "build" ? "rgba(0,245,255,0.12)" : "transparent", color: mode === "build" ? "#00f5ff" : "#8b93a7" }}
        >
          <Hammer className="w-3.5 h-3.5" /> BUILD FROM SCRATCH
        </button>
        <button
          onClick={() => setMode("paste")}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-mono font-bold tracking-wide transition-all"
          style={{ background: mode === "paste" ? "rgba(0,245,255,0.12)" : "transparent", color: mode === "paste" ? "#00f5ff" : "#8b93a7" }}
        >
          <ClipboardPaste className="w-3.5 h-3.5" /> PASTE ARCHITECTURE
        </button>
      </div>

      {mode === "paste" && !pasteGenerated ? (
        <div className="space-y-3">
          <div className="rounded-lg px-4 py-3 text-xs font-mono" style={{ background: "rgba(0,245,255,0.05)", border: "1px solid rgba(0,245,255,0.12)" }}>
            <p className="text-neon-cyan font-bold mb-1">HOW THIS WORKS</p>
            <p className="text-text-muted leading-relaxed">
              Paste a project tree using standard <code className="text-neon-green">tree</code>-style notation —
              folders end with <code className="text-neon-green">/</code>, files don&apos;t. We&apos;ll build the
              whole structure automatically; you can then click any generated file to add its content before downloading.
            </p>
          </div>

          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"my-project/\n├── public/\n│   └── index.html\n├── src/\n│   ├── index.js\n│   └── components/\n│       └── App.js\n└── package.json"}
            className="w-full rounded-lg p-4 text-xs font-mono resize-none outline-none"
            style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(0,245,255,0.15)", color: "#e2e8f0", minHeight: 260, lineHeight: 1.6 }}
            spellCheck={false}
          />

          {parseError && (
            <div className="rounded-lg px-4 py-3 text-xs font-mono flex items-start gap-2"
              style={{ background: "rgba(255,0,60,0.06)", border: "1px solid rgba(255,0,60,0.25)", color: "#ff6b8a" }}>
              <FileWarning className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          <button
            onClick={handleGenerateFromPaste}
            disabled={!pasteText.trim()}
            className="w-full py-3.5 flex items-center justify-center gap-2 font-mono font-bold tracking-widest text-sm rounded-lg border transition-all duration-300 disabled:opacity-50"
            style={{ background: "rgba(0,245,255,0.1)", borderColor: "rgba(0,245,255,0.5)", color: "#00f5ff" }}
          >
            <ClipboardPaste className="w-4 h-4" />
            PARSE &amp; GENERATE PROJECT
          </button>
        </div>
      ) : (
      <>
      {mode === "paste" && (
        <button
          onClick={() => setPasteGenerated(false)}
          className="text-[11px] font-mono text-text-muted hover:text-neon-cyan underline underline-offset-2"
        >
          ← Paste a different architecture
        </button>
      )}
      {/* Project name */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-1.5">Project Name</label>
          <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value.replace(/\s+/g, "-"))}
            className="input-cyber w-full text-sm" placeholder="my-project" />
        </div>
        <div className="text-right flex-shrink-0 pt-5">
          <p className="text-[11px] font-mono text-text-muted">{fileCount} files · {folderCount} folders</p>
        </div>
      </div>

      {/* IDE layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(0,245,255,0.1)", minHeight: 400 }}>
        {/* File tree */}
        <div className="lg:col-span-2 border-b lg:border-b-0 lg:border-r border-neon-cyan/8" style={{ background: "rgba(0,0,0,0.4)" }}>
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
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono text-neon-cyan/50 uppercase tracking-widest px-2 truncate">{projectName}/</span>
              <div className="flex gap-1 flex-shrink-0">
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
        <div className="lg:col-span-3 flex flex-col" style={{ background: "rgba(10,15,30,0.8)" }}>
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
      </>
      )}
    </div>
  );
}