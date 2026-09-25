import { useState } from "react";
import {
  ArrowRight, ExternalLink, Github, Linkedin, Mail, MapPin, Phone,
  Moon, Sun, MessageCircle, Send, CheckCircle2, Circle, Clock,
  TrendingUp, Users, Briefcase, Layers, Cpu, ChevronRight,
  Target, Zap, BookOpen, Calendar, Activity, GitBranch, FileText,
  Upload, Database, Pencil, Check, X, Plus, Trash2,
} from "lucide-react";

/* ─── SVG Logo ─────────────────────────────────────────────────────────── */
function VeekayLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="76" height="76" rx="18" fill="#0d1535" stroke="url(#lg1)" strokeWidth="2" />
      <path d="M14 20 L28 58 L40 32 L52 58 L66 20" stroke="url(#lg1)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="14" cy="20" r="3.5" fill="#22d3ee" />
      <circle cx="40" cy="32" r="3.5" fill="#818cf8" />
      <circle cx="66" cy="20" r="3.5" fill="#22d3ee" />
      <circle cx="28" cy="58" r="3" fill="#22d3ee" opacity="0.7" />
      <circle cx="52" cy="58" r="3" fill="#818cf8" opacity="0.7" />
      <line x1="40" y1="32" x2="40" y2="65" stroke="#22d3ee" strokeWidth="1" strokeDasharray="2 3" opacity="0.3" />
    </svg>
  );
}

/* ─── Editable primitives ───────────────────────────────────────────────── */
interface EditFieldProps {
  value: string;
  onChange: (v: string) => void;
  editMode: boolean;
  multiline?: boolean;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}

function EF({ value, onChange, editMode, multiline, className, style, placeholder }: EditFieldProps) {
  const base: React.CSSProperties = {
    background: "rgba(34,211,238,0.08)",
    border: "1px dashed rgba(34,211,238,0.4)",
    borderRadius: "4px",
    outline: "none",
    width: "100%",
    color: "inherit",
    font: "inherit",
    resize: "none",
    padding: "2px 4px",
    ...style,
  };
  if (!editMode) return <span className={className} style={style}>{value}</span>;
  if (multiline)
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder={placeholder}
        className={className}
        style={base}
      />
    );
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      style={base}
    />
  );
}

/* ─── Default content ───────────────────────────────────────────────────── */
const DEFAULT = {
  nav: {
    name: "Veekay C",
    role: "AI PRODUCT LEADER",
    links: ["Home", "About", "Projects", "Articles", "Knowledge Hub", "Journey", "AI Assistant", "Resume", "Contact"],
  },
  hero: {
    badge: "AI PRODUCT LEADER · BUILDER · EDUCATOR",
    headline1: "Building AI Products",
    headline2: "that create",
    accent: "measurable impact.",
    description:
      "I help organizations design and scale intelligent products that solve real problems, improve lives, and drive measurable business outcomes.",
    capabilities: ["Strategy", "Execution", "Evaluation", "Leadership"],
    cta1: "View My Projects",
    cta2: "Read Articles",
    cta3: "Ask AI About Me",
    subLabel: "Veekay C",
    subRole: "AI PRODUCT LEADER · BUILDER · PROBLEM SOLVER",
  },
  stats: [
    { value: "19+", label: "Years Experience" },
    { value: "10,000+", label: "Users Impacted" },
    { value: "35%", label: "Efficiency Improvement" },
    { value: "80+", label: "Engineers Led" },
    { value: "5+", label: "Industries" },
    { value: "20+", label: "AI Projects" },
  ],
  projects: [
    {
      badge: "Featured",
      title: "ER Triage AI Co-pilot",
      desc: "Clinical AI co-pilot for ER nurses with agentic orchestration, RAG and HHH evaluation.",
      tags: ["OpenAI", "Pinecone", "NBN", "Supabase"],
    },
    {
      badge: "",
      title: "Document Parser",
      desc: "AI-powered document parsing for referrals, medication lists and clinical context synthesis.",
      tags: ["OCR", "FastAPI", "LLM", "RAG"],
    },
  ],
  builds: [
    {
      name: "ER Triage AI – v2.0",
      progress: 85,
      color: "#22d3ee",
      focus: ["Evaluation Dashboard", "UI/UX Improvements", "Hospital Workflow Testing", "Multi-language Support"],
      milestone: "Demo v2 + Hospital Pilot",
      milestoneDate: "Jul 31, 2026",
    },
    { name: "PMOS Knowledge Hub", progress: 65, color: "#818cf8", focus: [], milestone: "", milestoneDate: "" },
    { name: "AI Assistant (Personal)", progress: 45, color: "#34d399", focus: [], milestone: "", milestoneDate: "" },
  ],
  articles: [
    {
      logo: "M",
      logoBg: "#00ab6c",
      title: "Evaluation Is the Product: Why AI Teams Struggle to Measure Quality",
      date: "Jul 3, 2026",
      read: "8 min read",
    },
    {
      logo: "M",
      logoBg: "#1a8917",
      title: "What Does Good AI Look Like? The Metrics Every PM Should Understand",
      date: "Jun 27, 2026",
      read: "6 min read",
    },
    {
      logo: "in",
      logoBg: "#0077b5",
      title: "AI Is Not Software: Why AI Product Managers Need a New Playbook",
      date: "Jun 18, 2026",
      read: "6 min read",
    },
  ],
  roadmap: {
    completed: ["ER Triage MVP", "Document Parser MVP", "HHH Evaluation Framework", "Gemini Integration Project"],
    inProgress: ["PMOS Knowledge Hub", "AI Assistant", "Article Series (10+)", "Evaluation Dashboard"],
    comingSoon: ["Healthcare Copilot", "Open Source Eval Library", "AI Interview Coach", "Agent Marketplace"],
  },
  activity: [
    { icon: "file", text: 'Published article: "Evaluation Is the Product"', time: "2 days ago" },
    { icon: "git", text: "Pushed 15 commits to ER-Triage-AI-Co-pilot", time: "3 days ago" },
    { icon: "upload", text: "Uploaded new demo: ER Triage v1.8 Walkthrough", time: "5 days ago" },
    { icon: "db", text: "Added AI Metrics chapter to PMOS", time: "6 days ago" },
    { icon: "db", text: "Added new evaluation dataset (300 cases)", time: "1 week ago" },
  ],
  contact: {
    email: "VeekayC@icloud.com",
    phone: "(408) 726-2320",
    location: "Milpitas, CA, USA",
    tagline: "Building intelligent products that solve real problems, create impact, and shape the future.",
    ctaLabel: "Let's build the future together.",
    scheduleLabel: "Schedule a Call",
  },
};

type AppData = typeof DEFAULT;

/* ─── Edit panel drawer ──────────────────────────────────────────────────── */
function EditPanel({
  data,
  setData,
  onClose,
}: {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  onClose: () => void;
}) {
  const [tab, setTab] = useState("hero");

  const tabs = ["hero", "stats", "projects", "builds", "articles", "roadmap", "activity", "contact"];

  const inputCls = "w-full rounded-lg px-3 py-2 text-sm outline-none";
  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#e8eaf6",
  };
  const label = (t: string) => (
    <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 600, letterSpacing: "0.06em", marginBottom: "4px" }}>{t}</div>
  );
  const field = (val: string, onChg: (v: string) => void, multi = false) =>
    multi ? (
      <textarea
        value={val}
        onChange={(e) => onChg(e.target.value)}
        rows={3}
        className={inputCls}
        style={{ ...inputStyle, resize: "none" }}
      />
    ) : (
      <input value={val} onChange={(e) => onChg(e.target.value)} className={inputCls} style={inputStyle} />
    );

  const upd = (path: string[], val: unknown) =>
    setData((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as AppData;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let cur: any = next;
      for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
      cur[path[path.length - 1]] = val;
      return next;
    });

  return (
    <div
      className="fixed inset-0 z-50 flex"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="ml-auto h-full flex flex-col overflow-hidden"
        style={{
          width: "min(480px, 100vw)",
          background: "#0d1535",
          borderLeft: "1px solid rgba(34,211,238,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-2">
            <Pencil size={15} style={{ color: "#22d3ee" }} />
            <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: "#e8eaf6" }}>Edit Content</span>
          </div>
          <button onClick={onClose} style={{ color: "#64748b" }}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex overflow-x-auto gap-1 px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize flex-shrink-0"
              style={{
                background: tab === t ? "rgba(34,211,238,0.15)" : "transparent",
                color: tab === t ? "#22d3ee" : "#64748b",
                border: tab === t ? "1px solid rgba(34,211,238,0.2)" : "1px solid transparent",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* ── HERO ── */}
          {tab === "hero" && (
            <div className="flex flex-col gap-4">
              <div>{label("Badge Text")}{field(data.hero.badge, (v) => upd(["hero", "badge"], v))}</div>
              <div>{label("Headline Line 1")}{field(data.hero.headline1, (v) => upd(["hero", "headline1"], v))}</div>
              <div>{label("Headline Line 2")}{field(data.hero.headline2, (v) => upd(["hero", "headline2"], v))}</div>
              <div>{label("Accent / Gradient Text")}{field(data.hero.accent, (v) => upd(["hero", "accent"], v))}</div>
              <div>{label("Description")}{field(data.hero.description, (v) => upd(["hero", "description"], v), true)}</div>
              <div>
                {label("Capabilities (one per line)")}
                <textarea
                  value={data.hero.capabilities.join("\n")}
                  onChange={(e) => upd(["hero", "capabilities"], e.target.value.split("\n"))}
                  rows={4}
                  className={inputCls}
                  style={{ ...inputStyle, resize: "none" }}
                />
              </div>
              <div>{label("CTA Button 1")}{field(data.hero.cta1, (v) => upd(["hero", "cta1"], v))}</div>
              <div>{label("CTA Button 2")}{field(data.hero.cta2, (v) => upd(["hero", "cta2"], v))}</div>
              <div>{label("CTA Button 3")}{field(data.hero.cta3, (v) => upd(["hero", "cta3"], v))}</div>
              <div>{label("Logo Sub-Label")}{field(data.hero.subLabel, (v) => upd(["hero", "subLabel"], v))}</div>
              <div>{label("Logo Sub-Role")}{field(data.hero.subRole, (v) => upd(["hero", "subRole"], v))}</div>
              <div>{label("Nav Name")}{field(data.nav.name, (v) => upd(["nav", "name"], v))}</div>
              <div>{label("Nav Role Tag")}{field(data.nav.role, (v) => upd(["nav", "role"], v))}</div>
            </div>
          )}

          {/* ── STATS ── */}
          {tab === "stats" && (
            <div className="flex flex-col gap-5">
              {data.stats.map((s, i) => (
                <div key={i} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Stat #{i + 1}</span>
                    <button
                      onClick={() => upd(["stats"], data.stats.filter((_, j) => j !== i))}
                      style={{ color: "#ef4444" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      {label("Value")}{field(s.value, (v) => upd(["stats", i as unknown as string, "value"], v))}
                    </div>
                    <div className="flex-1">
                      {label("Label")}{field(s.label, (v) => upd(["stats", i as unknown as string, "label"], v))}
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => upd(["stats"], [...data.stats, { value: "0+", label: "New Metric" }])}
                className="flex items-center justify-center gap-2 py-2 rounded-lg text-sm"
                style={{ border: "1px dashed rgba(34,211,238,0.3)", color: "#22d3ee" }}
              >
                <Plus size={14} /> Add Stat
              </button>
            </div>
          )}

          {/* ── PROJECTS ── */}
          {tab === "projects" && (
            <div className="flex flex-col gap-5">
              {data.projects.map((p, i) => (
                <div key={i} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Project #{i + 1}</span>
                    <button onClick={() => upd(["projects"], data.projects.filter((_, j) => j !== i))} style={{ color: "#ef4444" }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div>{label("Badge (e.g. Featured)")}{field(p.badge, (v) => upd(["projects", i as unknown as string, "badge"], v))}</div>
                    <div>{label("Title")}{field(p.title, (v) => upd(["projects", i as unknown as string, "title"], v))}</div>
                    <div>{label("Description")}{field(p.desc, (v) => upd(["projects", i as unknown as string, "desc"], v), true)}</div>
                    <div>
                      {label("Tags (comma separated)")}
                      <input
                        value={p.tags.join(", ")}
                        onChange={(e) => upd(["projects", i as unknown as string, "tags"], e.target.value.split(",").map((t) => t.trim()))}
                        className={inputCls}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => upd(["projects"], [...data.projects, { badge: "", title: "New Project", desc: "Description here.", tags: [] }])}
                className="flex items-center justify-center gap-2 py-2 rounded-lg text-sm"
                style={{ border: "1px dashed rgba(34,211,238,0.3)", color: "#22d3ee" }}
              >
                <Plus size={14} /> Add Project
              </button>
            </div>
          )}

          {/* ── BUILDS ── */}
          {tab === "builds" && (
            <div className="flex flex-col gap-5">
              {data.builds.map((b, i) => (
                <div key={i} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Build #{i + 1}</span>
                    <button onClick={() => upd(["builds"], data.builds.filter((_, j) => j !== i))} style={{ color: "#ef4444" }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div>{label("Name")}{field(b.name, (v) => upd(["builds", i as unknown as string, "name"], v))}</div>
                    <div>
                      {label(`Progress: ${b.progress}%`)}
                      <input
                        type="range" min={0} max={100} value={b.progress}
                        onChange={(e) => upd(["builds", i as unknown as string, "progress"], Number(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                    <div>{label("Milestone")}{field(b.milestone, (v) => upd(["builds", i as unknown as string, "milestone"], v))}</div>
                    <div>{label("Milestone Date")}{field(b.milestoneDate, (v) => upd(["builds", i as unknown as string, "milestoneDate"], v))}</div>
                    <div>
                      {label("Focus Items (one per line)")}
                      <textarea
                        value={b.focus.join("\n")}
                        onChange={(e) => upd(["builds", i as unknown as string, "focus"], e.target.value.split("\n").filter(Boolean))}
                        rows={4}
                        className={inputCls}
                        style={{ ...inputStyle, resize: "none" }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => upd(["builds"], [...data.builds, { name: "New Build", progress: 10, color: "#22d3ee", focus: [], milestone: "", milestoneDate: "" }])}
                className="flex items-center justify-center gap-2 py-2 rounded-lg text-sm"
                style={{ border: "1px dashed rgba(34,211,238,0.3)", color: "#22d3ee" }}
              >
                <Plus size={14} /> Add Build
              </button>
            </div>
          )}

          {/* ── ARTICLES ── */}
          {tab === "articles" && (
            <div className="flex flex-col gap-5">
              {data.articles.map((a, i) => (
                <div key={i} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Article #{i + 1}</span>
                    <button onClick={() => upd(["articles"], data.articles.filter((_, j) => j !== i))} style={{ color: "#ef4444" }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div>{label("Title")}{field(a.title, (v) => upd(["articles", i as unknown as string, "title"], v), true)}</div>
                    <div className="flex gap-3">
                      <div className="flex-1">{label("Logo Letter")}{field(a.logo, (v) => upd(["articles", i as unknown as string, "logo"], v))}</div>
                      <div className="flex-1">{label("Logo BG Color")}{field(a.logoBg, (v) => upd(["articles", i as unknown as string, "logoBg"], v))}</div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">{label("Date")}{field(a.date, (v) => upd(["articles", i as unknown as string, "date"], v))}</div>
                      <div className="flex-1">{label("Read Time")}{field(a.read, (v) => upd(["articles", i as unknown as string, "read"], v))}</div>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => upd(["articles"], [...data.articles, { logo: "M", logoBg: "#333", title: "New Article", date: "Jan 1, 2026", read: "5 min read" }])}
                className="flex items-center justify-center gap-2 py-2 rounded-lg text-sm"
                style={{ border: "1px dashed rgba(34,211,238,0.3)", color: "#22d3ee" }}
              >
                <Plus size={14} /> Add Article
              </button>
            </div>
          )}

          {/* ── ROADMAP ── */}
          {tab === "roadmap" && (
            <div className="flex flex-col gap-6">
              {(["completed", "inProgress", "comingSoon"] as const).map((col) => (
                <div key={col}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: col === "completed" ? "#34d399" : col === "inProgress" ? "#fb923c" : "#818cf8", marginBottom: "0.75rem", letterSpacing: "0.06em" }}>
                    {col === "completed" ? "✓ Completed" : col === "inProgress" ? "⟳ In Progress" : "○ Coming Soon"}
                  </div>
                  <div className="flex flex-col gap-2">
                    {data.roadmap[col].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          value={item}
                          onChange={(e) => {
                            const arr = [...data.roadmap[col]];
                            arr[i] = e.target.value;
                            upd(["roadmap", col], arr);
                          }}
                          className={inputCls}
                          style={inputStyle}
                        />
                        <button onClick={() => upd(["roadmap", col], data.roadmap[col].filter((_, j) => j !== i))} style={{ color: "#ef4444" }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => upd(["roadmap", col], [...data.roadmap[col], "New Item"])}
                      className="flex items-center gap-1.5 text-xs py-1.5"
                      style={{ color: "#64748b" }}
                    >
                      <Plus size={12} /> Add item
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── ACTIVITY ── */}
          {tab === "activity" && (
            <div className="flex flex-col gap-4">
              {data.activity.map((a, i) => (
                <div key={i} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Activity #{i + 1}</span>
                    <button onClick={() => upd(["activity"], data.activity.filter((_, j) => j !== i))} style={{ color: "#ef4444" }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div>{label("Text")}{field(a.text, (v) => upd(["activity", i as unknown as string, "text"], v))}</div>
                    <div>{label("Time")}{field(a.time, (v) => upd(["activity", i as unknown as string, "time"], v))}</div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => upd(["activity"], [...data.activity, { icon: "file", text: "New activity", time: "Just now" }])}
                className="flex items-center justify-center gap-2 py-2 rounded-lg text-sm"
                style={{ border: "1px dashed rgba(34,211,238,0.3)", color: "#22d3ee" }}
              >
                <Plus size={14} /> Add Activity
              </button>
            </div>
          )}

          {/* ── CONTACT ── */}
          {tab === "contact" && (
            <div className="flex flex-col gap-4">
              <div>{label("Email")}{field(data.contact.email, (v) => upd(["contact", "email"], v))}</div>
              <div>{label("Phone")}{field(data.contact.phone, (v) => upd(["contact", "phone"], v))}</div>
              <div>{label("Location")}{field(data.contact.location, (v) => upd(["contact", "location"], v))}</div>
              <div>{label("Footer Tagline")}{field(data.contact.tagline, (v) => upd(["contact", "tagline"], v), true)}</div>
              <div>{label("Footer CTA Headline")}{field(data.contact.ctaLabel, (v) => upd(["contact", "ctaLabel"], v))}</div>
              <div>{label("Schedule Button Label")}{field(data.contact.scheduleLabel, (v) => upd(["contact", "scheduleLabel"], v))}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Changes apply instantly</span>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "linear-gradient(135deg, #22d3ee, #818cf8)", color: "#060c24" }}
          >
            <Check size={14} /> Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main App ───────────────────────────────────────────────────────────── */
const NAV_LINKS = DEFAULT.nav.links;
const CAPABILITY_ICONS = [<Target size={14} />, <Zap size={14} />, <Activity size={14} />, <Users size={14} />];
const STAT_ICONS = [<Briefcase size={18} />, <Users size={18} />, <TrendingUp size={18} />, <Users size={18} />, <Layers size={18} />, <Cpu size={18} />];
const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  file: <FileText size={14} />, git: <GitBranch size={14} />, upload: <Upload size={14} />, db: <Database size={14} />,
};

export default function App() {
  const [data, setData] = useState<AppData>(DEFAULT);
  const [editOpen, setEditOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Home");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSend = () => {
    if (!chatInput.trim()) return;
    const q = chatInput.trim();
    setChatMessages((p) => [
      ...p,
      { role: "user", text: q },
      { role: "ai", text: `Thanks for your question! I'm Veekay's AI assistant. I can share details about his ${data.stats[0]?.value} of experience in AI Product Management, including ${data.projects[0]?.title} and more.` },
    ]);
    setChatInput("");
  };

  const quickQs = [
    "What healthcare AI products has Veekay built?",
    "How does Veekay evaluate AI products?",
    "What frameworks does he use for PM?",
    "Show me his latest projects and progress.",
  ];

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Inter', sans-serif", background: "var(--background)", color: "var(--foreground)" }}>

      {editOpen && <EditPanel data={data} setData={setData} onClose={() => setEditOpen(false)} />}

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-40" style={{ background: "rgba(13,21,53,0.97)", borderBottom: "1px solid var(--border)", backdropFilter: "blur(16px)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3 flex-shrink-0">
            <VeekayLogo size={40} />
            <div className="hidden sm:block">
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "1rem", color: "#e8eaf6" }}>{data.nav.name}</div>
              <div style={{ fontSize: "0.6rem", color: "#22d3ee", letterSpacing: "0.12em", fontWeight: 600 }}>{data.nav.role}</div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-0.5">
            {NAV_LINKS.map((link) => (
              <button
                key={link}
                onClick={() => setActiveNav(link)}
                className="px-3 py-1.5 rounded-md text-sm transition-all duration-200"
                style={{ color: activeNav === link ? "#22d3ee" : "#94a3b8", fontWeight: activeNav === link ? 600 : 400, borderBottom: activeNav === link ? "2px solid #22d3ee" : "2px solid transparent", background: "transparent" }}
              >
                {link}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Edit toggle */}
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{ background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.2)", color: "#22d3ee" }}
            >
              <Pencil size={12} /> Edit
            </button>
            <button
              className="lg:hidden w-8 h-8 rounded flex items-center justify-center"
              style={{ background: "var(--secondary)", color: "#94a3b8" }}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <span className="text-xs">☰</span>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden px-4 pb-4 flex flex-col gap-1" style={{ borderTop: "1px solid var(--border)" }}>
            {NAV_LINKS.map((link) => (
              <button key={link} onClick={() => { setActiveNav(link); setMobileOpen(false); }} className="text-left px-3 py-2 rounded text-sm" style={{ color: activeNav === link ? "#22d3ee" : "#94a3b8" }}>
                {link}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0b1428 0%, #0f1e48 45%, #0b1428 100%)", paddingTop: "4rem", paddingBottom: "3.5rem" }}
      >
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #22d3ee 1px, transparent 0)", backgroundSize: "40px 40px" }} />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #22d3ee, transparent)", transform: "translate(30%,-30%)" }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6" style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.3)", color: "#22d3ee", letterSpacing: "0.08em" }}>
                {data.hero.badge}
              </div>

              <h1 className="mb-4" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "clamp(2rem, 5vw, 3.2rem)", lineHeight: 1.15, color: "#e8eaf6" }}>
                {data.hero.headline1}<br />
                {data.hero.headline2}{" "}
                <span style={{ background: "linear-gradient(90deg,#22d3ee,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {data.hero.accent}
                </span>
              </h1>

              <p className="mb-6 leading-relaxed" style={{ color: "#8fa3c0", fontSize: "1rem", maxWidth: "520px" }}>
                {data.hero.description}
              </p>

              <div className="flex flex-wrap gap-3 mb-8">
                {data.hero.capabilities.map((cap, i) => (
                  <div key={cap} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#8fa3c0" }}>
                    <span style={{ color: "#22d3ee" }}>{CAPABILITY_ICONS[i % 4]}</span>{cap}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-all" style={{ background: "linear-gradient(135deg,#22d3ee,#818cf8)", color: "#060c24" }}>
                  {data.hero.cta1} <ArrowRight size={16} />
                </button>
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#e8eaf6" }}>
                  <BookOpen size={16} /> {data.hero.cta2}
                </button>
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#e8eaf6" }}>
                  <MessageCircle size={16} /> {data.hero.cta3}
                </button>
              </div>
            </div>

            {/* Hero logo */}
            <div className="hidden lg:flex items-center justify-center">
              <div className="relative flex items-center justify-center" style={{ width: "300px", height: "300px" }}>
                <div className="absolute rounded-full" style={{ width: "300px", height: "300px", background: "radial-gradient(circle,rgba(34,211,238,0.06) 0%,transparent 70%)", border: "1px solid rgba(34,211,238,0.1)" }} />
                <div className="absolute rounded-full" style={{ width: "215px", height: "215px", border: "1px dashed rgba(34,211,238,0.15)" }} />
                <div className="relative rounded-2xl flex items-center justify-center" style={{ width: "140px", height: "140px", background: "rgba(11,20,40,0.95)", border: "1px solid rgba(34,211,238,0.25)", boxShadow: "0 0 40px rgba(34,211,238,0.12)" }}>
                  <VeekayLogo size={110} />
                </div>
                {[0, 72, 144, 216, 288].map((deg, i) => (
                  <div key={deg} className="absolute w-2.5 h-2.5 rounded-full" style={{ background: i % 2 === 0 ? "#22d3ee" : "#818cf8", boxShadow: `0 0 8px ${i % 2 === 0 ? "#22d3ee" : "#818cf8"}`, top: `calc(50% + ${Math.sin((deg * Math.PI) / 180) * 107}px - 5px)`, left: `calc(50% + ${Math.cos((deg * Math.PI) / 180) * 107}px - 5px)` }} />
                ))}
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
                  <div style={{ color: "#22d3ee", fontSize: "0.65rem", letterSpacing: "0.15em", fontWeight: 700 }}>{data.hero.subLabel}</div>
                  <div style={{ color: "#4a5f7a", fontSize: "0.55rem", letterSpacing: "0.06em" }}>{data.hero.subRole}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <div style={{ background: "#0f1e48", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {data.stats.map((s, i) => (
              <div key={i} className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span style={{ color: "#22d3ee" }}>{STAT_ICONS[i % STAT_ICONS.length]}</span>
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "1.5rem", color: "#e8eaf6" }}>{s.value}</span>
                </div>
                <div style={{ fontSize: "0.72rem", color: "#4a5f7a" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN 3-COL ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* FEATURED PROJECTS */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "0.78rem", letterSpacing: "0.1em", color: "#4a5f7a" }}>FEATURED PROJECTS</h2>
              <button className="flex items-center gap-1 text-xs" style={{ color: "#22d3ee" }}>View all <ArrowRight size={12} /></button>
            </div>
            <div className="flex flex-col gap-4">
              {data.projects.map((p, i) => (
                <div key={i} className="rounded-xl p-4" style={{ background: "#0f1e48", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="rounded-lg mb-3 relative overflow-hidden" style={{ height: "96px", background: "linear-gradient(135deg,#0b1428,#0f1e48)", border: "1px solid rgba(34,211,238,0.08)" }}>
                    <div className="absolute inset-0 flex items-center justify-center opacity-15"><Cpu size={40} style={{ color: "#22d3ee" }} /></div>
                    {p.badge && <div className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded" style={{ background: "#22d3ee", color: "#060c24", fontWeight: 600 }}>{p.badge}</div>}
                  </div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: "0.88rem", color: "#e8eaf6", marginBottom: "0.4rem" }}>{p.title}</div>
                  <div style={{ fontSize: "0.78rem", color: "#4a5f7a", lineHeight: 1.5, marginBottom: "0.75rem" }}>{p.desc}</div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {p.tags.map((tag) => <span key={tag} className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(34,211,238,0.07)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.12)" }}>{tag}</span>)}
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="flex items-center gap-1 text-xs" style={{ color: "#22d3ee" }}>Case Study <ChevronRight size={12} /></button>
                    <Github size={14} style={{ color: "#4a5f7a", cursor: "pointer" }} />
                    <ExternalLink size={14} style={{ color: "#4a5f7a", cursor: "pointer" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* NOW BUILDING */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "0.78rem", letterSpacing: "0.1em", color: "#4a5f7a" }}>NOW BUILDING</h2>
              <button className="flex items-center gap-1 text-xs" style={{ color: "#22d3ee" }}>View roadmap <ArrowRight size={12} /></button>
            </div>

            {data.builds[0] && (
              <div className="rounded-xl p-5 mb-4" style={{ background: "#0f1e48", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center justify-between mb-2">
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "0.92rem", color: "#e8eaf6" }}>{data.builds[0].name}</div>
                  <span style={{ color: "#22d3ee", fontWeight: 700, fontSize: "0.85rem" }}>{data.builds[0].progress}%</span>
                </div>
                <div className="rounded-full mb-5" style={{ height: "6px", background: "rgba(255,255,255,0.07)" }}>
                  <div className="rounded-full h-full" style={{ width: `${data.builds[0].progress}%`, background: "linear-gradient(90deg,#22d3ee,#818cf8)" }} />
                </div>
                {data.builds[0].focus.length > 0 && (
                  <>
                    <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "#4a5f7a", letterSpacing: "0.08em", marginBottom: "0.6rem" }}>Current Focus</div>
                    <div className="flex flex-col gap-1.5 mb-4">
                      {data.builds[0].focus.map((item) => (
                        <div key={item} className="flex items-center gap-2" style={{ fontSize: "0.8rem", color: "#8fa3c0" }}>
                          <CheckCircle2 size={13} style={{ color: "#22d3ee", flexShrink: 0 }} />{item}
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {data.builds[0].milestone && (
                  <div className="flex items-center justify-between rounded-lg px-3 py-2 mb-4" style={{ background: "rgba(34,211,238,0.05)", border: "1px solid rgba(34,211,238,0.1)" }}>
                    <div>
                      <div style={{ fontSize: "0.65rem", color: "#4a5f7a", marginBottom: "2px" }}>Next Milestone</div>
                      <div style={{ fontSize: "0.8rem", color: "#e8eaf6", fontWeight: 500 }}>{data.builds[0].milestone}</div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: "#22d3ee" }}>
                      <Calendar size={12} />{data.builds[0].milestoneDate}
                    </div>
                  </div>
                )}
                <button className="w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90" style={{ background: "rgba(34,211,238,0.1)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.18)" }}>
                  <Activity size={14} /> Follow Progress
                </button>
              </div>
            )}

            {data.builds.slice(1).map((b, i) => (
              <div key={i} className="rounded-xl px-4 py-3 mb-3 flex items-center gap-4" style={{ background: "#0f1e48", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex-1">
                  <div style={{ fontSize: "0.8rem", color: "#e8eaf6", fontWeight: 500, marginBottom: "0.4rem" }}>{b.name}</div>
                  <div className="rounded-full" style={{ height: "4px", background: "rgba(255,255,255,0.07)" }}>
                    <div className="rounded-full h-full" style={{ width: `${b.progress}%`, background: b.color }} />
                  </div>
                </div>
                <span style={{ color: b.color, fontWeight: 700, fontSize: "0.82rem", flexShrink: 0 }}>{b.progress}%</span>
              </div>
            ))}
          </div>

          {/* LATEST WRITING */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "0.78rem", letterSpacing: "0.1em", color: "#4a5f7a" }}>LATEST WRITING</h2>
              <button className="flex items-center gap-1 text-xs" style={{ color: "#22d3ee" }}>View all <ArrowRight size={12} /></button>
            </div>
            <div className="flex flex-col gap-3">
              {data.articles.map((a, i) => (
                <div key={i} className="rounded-xl p-4 flex gap-3 items-start cursor-pointer" style={{ background: "#0f1e48", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 text-white" style={{ background: a.logoBg }}>{a.logo}</div>
                  <div>
                    <div style={{ fontSize: "0.8rem", color: "#e8eaf6", fontWeight: 500, lineHeight: 1.45, marginBottom: "0.35rem" }}>{a.title}</div>
                    <div style={{ fontSize: "0.7rem", color: "#4a5f7a" }}>{a.date} · {a.read}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-80 transition-all" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#8fa3c0" }}>
              Explore All Articles
            </button>
          </div>
        </div>

        {/* ── SECOND ROW ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">

          {/* AI ASSISTANT */}
          <div className="rounded-xl overflow-hidden flex flex-col" style={{ background: "linear-gradient(135deg,#0f1e48,#131e48)", border: "1px solid rgba(34,211,238,0.12)", minHeight: "340px" }}>
            <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle size={15} style={{ color: "#22d3ee" }} />
                <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "0.85rem", color: "#e8eaf6" }}>MEET MY AI ASSISTANT</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(34,211,238,0.12)", color: "#22d3ee", fontWeight: 600 }}>BETA</span>
              </div>
              <p style={{ fontSize: "0.74rem", color: "#4a5f7a", lineHeight: 1.5 }}>Ask anything about my experience, projects, leadership style, or AI product management insights.</p>
            </div>

            <div className="flex-1 px-5 py-3 overflow-y-auto" style={{ maxHeight: "180px" }}>
              {chatMessages.length === 0 ? (
                <div className="flex flex-col gap-2">
                  {quickQs.map((q) => (
                    <button key={q} onClick={() => setChatMessages([{ role: "user", text: q }, { role: "ai", text: `Great question! Veekay has built multiple AI-powered products impacting ${data.stats[1]?.value} users. ${data.projects[0]?.title} is a flagship example.` }])} className="text-left text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", color: "#8fa3c0" }}>
                      {q}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className="text-xs px-3 py-2 rounded-lg" style={{ background: m.role === "user" ? "rgba(34,211,238,0.12)" : "rgba(255,255,255,0.04)", color: m.role === "user" ? "#22d3ee" : "#8fa3c0", maxWidth: "85%", lineHeight: 1.5 }}>{m.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 pb-5">
              <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Ask me anything..." className="flex-1 bg-transparent outline-none text-xs" style={{ color: "#e8eaf6" }} />
                <button onClick={handleSend} style={{ color: "#22d3ee" }}><Send size={14} /></button>
              </div>
              <button className="w-full mt-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all" style={{ background: "linear-gradient(135deg,#22d3ee,#818cf8)", color: "#060c24" }}>
                <MessageCircle size={14} /> Start a Conversation
              </button>
            </div>
          </div>

          {/* PUBLIC ROADMAP */}
          <div className="rounded-xl p-5" style={{ background: "#0f1e48", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "0.78rem", letterSpacing: "0.1em", color: "#4a5f7a" }}>PUBLIC ROADMAP</h2>
              <button className="flex items-center gap-1 text-xs" style={{ color: "#22d3ee" }}>View full roadmap <ArrowRight size={12} /></button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="flex items-center gap-1.5 mb-3"><CheckCircle2 size={11} style={{ color: "#34d399" }} /><span style={{ fontSize: "0.66rem", fontWeight: 600, color: "#34d399", letterSpacing: "0.06em" }}>Completed</span></div>
                {data.roadmap.completed.map((item) => <div key={item} style={{ fontSize: "0.7rem", color: "#4a5f7a", lineHeight: 1.5, marginBottom: "6px" }}>{item}</div>)}
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-3"><Clock size={11} style={{ color: "#fb923c" }} /><span style={{ fontSize: "0.66rem", fontWeight: 600, color: "#fb923c", letterSpacing: "0.06em" }}>In Progress</span></div>
                {data.roadmap.inProgress.map((item) => <div key={item} style={{ fontSize: "0.7rem", color: "#4a5f7a", lineHeight: 1.5, marginBottom: "6px" }}>{item}</div>)}
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-3"><Circle size={11} style={{ color: "#818cf8" }} /><span style={{ fontSize: "0.66rem", fontWeight: 600, color: "#818cf8", letterSpacing: "0.06em" }}>Coming Soon</span></div>
                {data.roadmap.comingSoon.map((item) => <div key={item} style={{ fontSize: "0.7rem", color: "#4a5f7a", lineHeight: 1.5, marginBottom: "6px" }}>{item}</div>)}
              </div>
            </div>
            <div className="mt-4 pt-3 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "0.68rem", color: "#4a5f7a" }}>
              Roadmap is updated weekly. <button style={{ color: "#22d3ee" }}>Follow my journey!</button>
            </div>
          </div>

          {/* RECENT ACTIVITY */}
          <div className="rounded-xl p-5" style={{ background: "#0f1e48", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "0.78rem", letterSpacing: "0.1em", color: "#4a5f7a" }}>RECENT ACTIVITY</h2>
              <button className="flex items-center gap-1 text-xs" style={{ color: "#22d3ee" }}>View all <ArrowRight size={12} /></button>
            </div>
            <div className="flex flex-col gap-4">
              {data.activity.map((a, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(34,211,238,0.07)", color: "#22d3ee" }}>
                    {ACTIVITY_ICONS[a.icon] ?? <FileText size={14} />}
                  </div>
                  <div className="flex-1">
                    <div style={{ fontSize: "0.76rem", color: "#8fa3c0", lineHeight: 1.45 }}>{a.text}</div>
                    <div style={{ fontSize: "0.66rem", color: "#4a5f7a", marginTop: "2px" }}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{ background: "#0b1428", borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "2rem" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <VeekayLogo size={40} />
                <div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: "#e8eaf6" }}>{data.nav.name}</div>
                  <div style={{ fontSize: "0.6rem", color: "#22d3ee", letterSpacing: "0.1em" }}>{data.nav.role}</div>
                </div>
              </div>
              <p style={{ fontSize: "0.8rem", color: "#4a5f7a", lineHeight: 1.7 }}>{data.contact.tagline}</p>
            </div>

            <div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: "0.75rem", color: "#4a5f7a", letterSpacing: "0.08em", marginBottom: "1rem" }}>QUICK LINKS</div>
              {["About Me", "Experience", "Projects", "Articles", "Knowledge Hub", "AI Assistant"].map((l) => (
                <button key={l} className="block text-left text-sm mb-2 hover:text-cyan-400 transition-colors" style={{ color: "#4a5f7a" }}>{l}</button>
              ))}
            </div>

            <div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: "0.75rem", color: "#4a5f7a", letterSpacing: "0.08em", marginBottom: "1rem" }}>RESOURCES</div>
              {["Resume (PDF)", "Case Studies", "Architecture Diagrams", "PRDs & Documents", "Templates", "Interview Prep"].map((l) => (
                <button key={l} className="block text-left text-sm mb-2 hover:text-cyan-400 transition-colors" style={{ color: "#4a5f7a" }}>{l}</button>
              ))}
            </div>

            <div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: "0.75rem", color: "#4a5f7a", letterSpacing: "0.08em", marginBottom: "1rem" }}>{"LET'S CONNECT"}</div>
              <div className="flex flex-col gap-2.5 mb-5">
                <div className="flex items-center gap-2 text-sm" style={{ color: "#4a5f7a" }}><Mail size={13} style={{ color: "#22d3ee" }} />{data.contact.email}</div>
                <div className="flex items-center gap-2 text-sm" style={{ color: "#4a5f7a" }}><Phone size={13} style={{ color: "#22d3ee" }} />{data.contact.phone}</div>
                <div className="flex items-center gap-2 text-sm" style={{ color: "#4a5f7a" }}><MapPin size={13} style={{ color: "#22d3ee" }} />{data.contact.location}</div>
              </div>
              <div className="flex gap-3 mb-5">
                {[Linkedin, Github, Mail].map((Icon, i) => (
                  <button key={i} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-80 transition-all" style={{ background: "rgba(34,211,238,0.07)", border: "1px solid rgba(34,211,238,0.12)", color: "#22d3ee" }}>
                    <Icon size={14} />
                  </button>
                ))}
              </div>
              <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "0.88rem", color: "#e8eaf6", marginBottom: "0.75rem" }}>{data.contact.ctaLabel}</div>
                <button className="w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all" style={{ background: "linear-gradient(135deg,#22d3ee,#818cf8)", color: "#060c24" }}>
                  <Calendar size={14} /> {data.contact.scheduleLabel}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between pt-6 gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: "0.72rem", color: "#4a5f7a" }}>© 2026 {data.nav.name}. All rights reserved.</div>
            <div style={{ fontSize: "0.72rem", color: "#4a5f7a" }}>Built with <span style={{ color: "#ef4444" }}>♥</span> and lots of ☕</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
