"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hash, Copy, RefreshCw, Twitter } from "lucide-react";
import { toast } from "sonner";

type Platform = "instagram" | "youtube" | "tiktok";

const HASHTAG_DB: Record<string, Record<Platform, string[]>> = {
  photography: {
    instagram: ["#photography", "#photo", "#photographer", "#photooftheday", "#naturephotography", "#portraitphotography", "#streetphotography", "#travelphotography", "#landscape", "#lightroom"],
    youtube: ["photography", "photo tips", "camera settings", "lightroom tutorial", "photography for beginners"],
    tiktok: ["#photography", "#photographer", "#phototips", "#photoshoot", "#cameratok"],
  },
  fitness: {
    instagram: ["#fitness", "#gym", "#workout", "#fitnessmotivation", "#bodybuilding", "#healthylifestyle", "#exercise", "#training", "#gains", "#fitfam"],
    youtube: ["fitness", "workout routine", "gym motivation", "weight loss", "muscle building"],
    tiktok: ["#fitness", "#gym", "#workout", "#fittok", "#gymtok"],
  },
  food: {
    instagram: ["#food", "#foodporn", "#instafood", "#foodie", "#homemade", "#cooking", "#recipe", "#delicious", "#yummy", "#foodphotography"],
    youtube: ["food recipe", "cooking tutorial", "easy recipes", "home cooking", "meal prep"],
    tiktok: ["#food", "#foodtok", "#recipe", "#cooking", "#foodie"],
  },
  travel: {
    instagram: ["#travel", "#wanderlust", "#travelgram", "#adventure", "#explore", "#travelphotography", "#backpacking", "#vacation", "#tourism", "#trip"],
    youtube: ["travel vlog", "travel tips", "budget travel", "travel guide", "solo travel"],
    tiktok: ["#travel", "#traveltok", "#adventure", "#wanderlust", "#travellife"],
  },
  technology: {
    instagram: ["#technology", "#tech", "#coding", "#programming", "#developer", "#software", "#ai", "#machinelearning", "#startup", "#innovation"],
    youtube: ["technology", "tech review", "programming tutorial", "coding for beginners", "AI explained"],
    tiktok: ["#tech", "#coding", "#programming", "#techtok", "#developer"],
  },
  fashion: {
    instagram: ["#fashion", "#style", "#ootd", "#streetstyle", "#fashionista", "#outfit", "#clothing", "#trendy", "#fashionblogger", "#designer"],
    youtube: ["fashion haul", "style tips", "outfit ideas", "lookbook", "fashion trends"],
    tiktok: ["#fashion", "#ootd", "#style", "#fashiontok", "#outfitcheck"],
  },
};

const GENERIC_TAGS: Record<Platform, string[]> = {
  instagram: ["#viral", "#trending", "#explore", "#instagood", "#reels", "#content", "#share", "#love", "#amazing", "#new"],
  youtube:   ["trending", "viral", "how to", "tips and tricks", "tutorial"],
  tiktok:    ["#viral", "#fyp", "#foryou", "#trending", "#tiktok"],
};

const PLATFORM_LIMITS: Record<Platform, number> = {
  instagram: 30,
  youtube: 15,
  tiktok: 20,
};

function generateHashtags(topic: string, platform: Platform): string[] {
  const lower = topic.toLowerCase();
  const tags: string[] = [];

  // Find matching category
  for (const [key, data] of Object.entries(HASHTAG_DB)) {
    if (lower.includes(key) || key.includes(lower)) {
      tags.push(...data[platform]);
      break;
    }
  }

  // Add generic tags
  tags.push(...GENERIC_TAGS[platform]);

  // Add topic-specific derived tags
  const words = topic.trim().split(/\s+/);
  for (const word of words.slice(0, 3)) {
    const clean = word.replace(/[^a-zA-Z0-9]/g, "");
    if (clean.length > 2) {
      if (platform === "instagram" || platform === "tiktok") {
        tags.push(`#${clean.toLowerCase()}`);
        tags.push(`#${clean.toLowerCase()}community`);
      } else {
        tags.push(clean.toLowerCase());
      }
    }
  }

  // Deduplicate and limit
  const unique = [...new Set(tags)];
  return unique.slice(0, PLATFORM_LIMITS[platform]);
}

const PLATFORM_COLORS: Record<Platform, string> = {
  instagram: "#ff00aa",
  youtube: "#ff0000",
  tiktok: "#00f5ff",
};

export function HashtagGenerator() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [tags, setTags] = useState<string[]>([]);
  const [generated, setGenerated] = useState(false);

  function generate() {
    if (!topic.trim()) { toast.error("Enter a topic first."); return; }
    const result = generateHashtags(topic, platform);
    setTags(result);
    setGenerated(true);
  }

  function copyAll() {
    const text = tags.join(platform === "youtube" ? ", " : " ");
    navigator.clipboard.writeText(text).then(() => toast.success(`${tags.length} tags copied!`));
  }

  function copyTag(tag: string) {
    navigator.clipboard.writeText(tag).then(() => toast.success("Copied!"));
  }

  const color = PLATFORM_COLORS[platform];

  return (
    <div className="space-y-6">
      {/* Platform selector */}
      <div>
        <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-3">Platform</label>
        <div className="grid grid-cols-3 gap-2">
          {(["instagram", "youtube", "tiktok"] as Platform[]).map((p) => (
            <button
              key={p}
              onClick={() => { setPlatform(p); setGenerated(false); }}
              className="py-2.5 rounded-lg text-xs font-mono font-semibold capitalize transition-all"
              style={{
                background: platform === p ? `${PLATFORM_COLORS[p]}15` : "rgba(255,255,255,0.03)",
                border: `1px solid ${platform === p ? PLATFORM_COLORS[p] : "rgba(255,255,255,0.08)"}`,
                color: platform === p ? PLATFORM_COLORS[p] : "#475569",
              }}
            >
              {p === "youtube" ? "YouTube" : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Topic input */}
      <div>
        <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">Topic or Caption</label>
        <div className="relative">
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            placeholder="photography, fitness, travel, food, tech..."
            className="input-cyber w-full pl-10"
          />
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={generate}
        className="w-full py-3.5 flex items-center justify-center gap-2 font-mono font-bold tracking-widest text-sm rounded-lg border transition-all duration-300"
        style={{
          background: `${color}12`,
          borderColor: `${color}50`,
          color,
          boxShadow: `0 0 20px ${color}12`,
          textShadow: `0 0 10px ${color}60`,
        }}
      >
        <Hash className="w-4 h-4" />
        GENERATE HASHTAGS
      </button>

      {/* Results */}
      <AnimatePresence>
        {generated && tags.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Stats + copy */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-text-muted">
                {tags.length}/{PLATFORM_LIMITS[platform]} tags generated
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => { setTags(generateHashtags(topic, platform)); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-neon-cyan/15 rounded-lg text-text-muted hover:text-neon-cyan transition-all"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </button>
                <button
                  onClick={copyAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border rounded-lg transition-all"
                  style={{ borderColor: `${color}35`, color, background: `${color}08` }}
                >
                  <Copy className="w-3 h-3" />
                  Copy All
                </button>
              </div>
            </div>

            {/* Tag chips */}
            <div className="flex flex-wrap gap-2 p-4 rounded-xl" style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${color}15` }}>
              {tags.map((tag) => (
                <motion.button
                  key={tag}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => copyTag(tag)}
                  className="px-3 py-1.5 rounded-full text-xs font-mono transition-all hover:scale-105"
                  style={{
                    background: `${color}10`,
                    border: `1px solid ${color}25`,
                    color: `${color}cc`,
                  }}
                >
                  {tag}
                </motion.button>
              ))}
            </div>

            {/* Preview */}
            <div
              className="rounded-xl p-4"
              style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${color}12` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Twitter className="w-3.5 h-3.5" style={{ color }} />
                <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: `${color}70` }}>
                  Copy-ready for {platform}
                </span>
              </div>
              <p className="text-xs font-mono text-text-muted leading-relaxed break-all">
                {tags.join(platform === "youtube" ? ", " : " ")}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}