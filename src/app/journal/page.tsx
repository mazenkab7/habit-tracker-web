"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState, useMemo, useRef } from "react";
import TopNav from "@/components/TopNav";
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { codexAudio } from "@/lib/codexAudio";
import {
  BookOpen,
  Sparkles,
  Search,
  Calendar,
  Flame,
  RotateCcw,
  Bold,
  Italic,
  List,
  Quote,
  Trash2,
  CheckCircle2,
  Minimize2,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react";

/* ─── Simple & Clear Mood Definitions ─── */
const MOODS = [
  { key: "ignited", label: "Motivated", emoji: "🔥", color: "from-[#EA580C] to-[#F59E0B]", bg: "bg-orange-500/15 border-orange-500", text: "text-[#EA580C]", glow: "rgba(234, 88, 12, 0.45)" },
  { key: "grounded", label: "Calm", emoji: "🌿", color: "from-[#059669] to-[#10B981]", bg: "bg-emerald-500/15 border-emerald-500", text: "text-[#10B981]", glow: "rgba(16, 185, 129, 0.45)" },
  { key: "triumphant", label: "Happy", emoji: "☀️", color: "from-[#F59E0B] to-[#FBBF24]", bg: "bg-amber-500/15 border-amber-500", text: "text-[#F59E0B]", glow: "rgba(245, 158, 11, 0.5)" },
  { key: "stoic", label: "Okay", emoji: "😐", color: "from-stone-500 to-stone-700", bg: "bg-stone-500/15 border-stone-400", text: "text-stone-400", glow: "rgba(168, 162, 158, 0.35)" },
  { key: "weathered", label: "Tired", emoji: "🥱", color: "from-zinc-500 to-zinc-700", bg: "bg-zinc-500/15 border-zinc-400", text: "text-zinc-400", glow: "rgba(113, 113, 122, 0.35)" },
  { key: "crucible", label: "Stressed", emoji: "🌧️", color: "from-red-600 to-orange-700", bg: "bg-red-500/15 border-red-500", text: "text-red-400", glow: "rgba(239, 68, 68, 0.45)" },
];

/* ─── Backward Compatibility & Mood Normalization ─── */
const MOOD_ALIASES: Record<string, string> = {
  // Happy / Great
  happy: "triumphant",
  triumphant: "triumphant",
  ecstatic: "triumphant",
  amazing: "triumphant",
  great: "triumphant",
  awesome: "triumphant",
  fantastic: "triumphant",
  superb: "triumphant",

  // Motivated / Energized
  motivated: "ignited",
  energized: "ignited",
  ignited: "ignited",
  good: "ignited",
  excited: "ignited",
  productive: "ignited",
  high: "ignited",

  // Calm / Peaceful
  calm: "grounded",
  peaceful: "grounded",
  grounded: "grounded",
  relaxed: "grounded",
  content: "grounded",
  satisfied: "grounded",
  grateful: "grounded",
  serene: "grounded",

  // Okay / Neutral
  okay: "stoic",
  neutral: "stoic",
  stoic: "stoic",
  fine: "stoic",
  normal: "stoic",
  average: "stoic",
  meh: "stoic",

  // Tired / Low energy
  tired: "weathered",
  weathered: "weathered",
  fatigued: "weathered",
  low: "weathered",
  exhausted: "weathered",
  sleepy: "weathered",
  drained: "weathered",
  burnout: "weathered",

  // Stressed / Rough
  stressed: "crucible",
  crucible: "crucible",
  rough: "crucible",
  bad: "crucible",
  anxious: "crucible",
  overwhelmed: "crucible",
  down: "crucible",
  sad: "crucible",
  frustrated: "crucible",
  upset: "crucible",
};

const EMOJI_MOOD_MAP: Record<string, string> = {
  "🔥": "ignited",
  "⚡": "ignited",
  "💪": "ignited",
  "🌿": "grounded",
  "🌱": "grounded",
  "😌": "grounded",
  "☀️": "triumphant",
  "😊": "triumphant",
  "🙂": "triumphant",
  "🌟": "triumphant",
  "⭐": "triumphant",
  "✨": "triumphant",
  "😐": "stoic",
  "🗿": "stoic",
  "😶": "stoic",
  "🥱": "weathered",
  "🌫️": "weathered",
  "😴": "weathered",
  "😔": "weathered",
  "🌧️": "crucible",
  "🌋": "crucible",
  "😞": "crucible",
  "😫": "crucible",
  "😡": "crucible",
  "🤯": "crucible",
};

export const normalizeMood = (rawMood?: string | null): string => {
  if (!rawMood) return "";
  const trimmed = rawMood.trim();
  if (EMOJI_MOOD_MAP[trimmed]) return EMOJI_MOOD_MAP[trimmed];
  const cleaned = trimmed.toLowerCase();
  if (MOODS.some((m) => m.key === cleaned)) return cleaned;
  if (MOOD_ALIASES[cleaned]) return MOOD_ALIASES[cleaned];
  const byLabel = MOODS.find((m) => m.label.toLowerCase() === cleaned);
  if (byLabel) return byLabel.key;
  return cleaned;
};

export const getMoodInfo = (rawMood?: string | null) => {
  if (!rawMood) return null;
  const canonical = normalizeMood(rawMood);
  const found = MOODS.find((m) => m.key === canonical);
  if (found) return found;

  return {
    key: canonical,
    label: rawMood.charAt(0).toUpperCase() + rawMood.slice(1),
    emoji: EMOJI_MOOD_MAP[rawMood.trim()] || "📝",
    color: "from-[#EA580C] to-[#F59E0B]",
    bg: "bg-orange-500/15 border-orange-500",
    text: "text-[#EA580C]",
    glow: "rgba(234, 88, 12, 0.45)",
  };
};

const WRITING_PROMPTS = [
  "What went well today, and what made you feel good?",
  "What was the most challenging part of your day, and how did you handle it?",
  "What is one small win or progress you are proud of today?",
  "What drained your energy today, and how can you do better tomorrow?",
  "Who helped or supported you today, and why are you grateful for them?",
  "What is the most important thing you want to achieve tomorrow?",
  "How are you feeling right now, and what is on your mind?",
];

type PaperMode = "ruled" | "dotgrid" | "grid" | "blank";
type FontMode = "serif" | "typewriter" | "handwriting" | "mono";

type JournalEntry = {
  id: string;
  date: string;
  mood: string;
  content: string;
  gratitude: string;
  tags?: string[];
  bookmarked?: boolean;
  paperMode?: PaperMode;
  fontMode?: FontMode;
  createdAt: any;
};

const getToday = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function JournalPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [mood, setMood] = useState("");
  const [content, setContent] = useState("");
  const [gratitude, setGratitude] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [searchQuery, setSearchQuery] = useState("");
  const [moodFilter, setMoodFilter] = useState("all");
  const [promptIndex, setPromptIndex] = useState(0);

  // Tactile Codex Ritualis State
  const [paperMode, setPaperMode] = useState<PaperMode>("ruled");
  const [fontMode, setFontMode] = useState<FontMode>("serif");
  const [soundActive, setSoundActive] = useState(false);
  const [candlePos, setCandlePos] = useState({ x: 320, y: 220 });
  const [isInkCuring, setIsInkCuring] = useState(false);
  const [showCodexStamp, setShowCodexStamp] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [insertFlight, setInsertFlight] = useState(false);

  // Open Book Full Page Spread State
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [mobileBookPage, setMobileBookPage] = useState<"left" | "right">("right");

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const bookContentRef = useRef<HTMLTextAreaElement>(null);
  const bookContainerRef = useRef<HTMLDivElement>(null);

  // Initialize audio and preferences from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      setSoundActive(codexAudio.isEnabled());
      const savedPaper = localStorage.getItem("codex_paper_mode") as PaperMode;
      if (savedPaper) setPaperMode(savedPaper);
      const savedFont = localStorage.getItem("codex_font_mode") as FontMode;
      if (savedFont) setFontMode(savedFont);
    }
  }, []);

  // Close book on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isBookOpen) {
        setIsBookOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isBookOpen]);

  // When book opens, preserve cursor position and focus seamlessly
  useEffect(() => {
    if (isBookOpen && bookContentRef.current) {
      const el = bookContentRef.current;
      const len = el.value.length;
      el.focus();
      el.setSelectionRange(len, len);
      codexAudio.playPageTurn();
    }
  }, [isBookOpen]);

  const formattedDateString = useMemo(() => {
    try {
      const d = new Date(selectedDate + "T00:00:00");
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "journal"), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() } as JournalEntry)));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    const existing = entries.find((e) => e.date === selectedDate);
    if (existing) {
      setMood(normalizeMood(existing.mood));
      setContent(existing.content || "");
      setGratitude(existing.gratitude || "");
      setTags(existing.tags || []);
      setIsBookmarked(Boolean(existing.bookmarked));
      if (existing.paperMode) setPaperMode(existing.paperMode);
      if (existing.fontMode) setFontMode(existing.fontMode);
    } else {
      setMood("");
      setContent("");
      setGratitude("");
      setTags([]);
      setIsBookmarked(false);
    }
    setSaveStatus("idle");
    setShowCodexStamp(false);
  }, [selectedDate, entries]);

  const handleSave = async () => {
    if (!user) return;
    try {
      setSaving(true);
      setIsInkCuring(true);
      codexAudio.playEtchRitual();

      await setDoc(
        doc(db, "users", user.uid, "journal", selectedDate),
        {
          date: selectedDate,
          mood,
          content,
          gratitude,
          tags,
          bookmarked: isBookmarked,
          paperMode,
          fontMode,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSaveStatus("saved");
      setShowCodexStamp(true);
      setTimeout(() => setIsInkCuring(false), 2000);
      setTimeout(() => setSaveStatus("idle"), 3500);
    } catch (err) {
      console.error(err);
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (date: string) => {
    if (!user || !confirm(`Delete journal entry for ${date}?`)) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "journal", date));
      if (selectedDate === date) {
        setContent("");
        setGratitude("");
        setMood("");
        setTags([]);
        setIsBookmarked(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, "");
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
      codexAudio.playWaxSeal();
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  const insertFormatting = (prefix: string, suffix = "") => {
    const el = isBookOpen ? bookContentRef.current : contentRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selected = text.substring(start, end);
    const replacement = `${prefix}${selected || "text"}${suffix}`;
    const newContent = text.substring(0, start) + replacement + text.substring(end);
    setContent(newContent);
    codexAudio.playPenScratch();
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 10);
  };

  const handleInsertPrompt = () => {
    const promptText = `> *"${WRITING_PROMPTS[promptIndex]}"*\n\n`;
    // Clean previous prompt quote if already present
    const cleanContent = content.replace(/^> \*"[^"]+"\*\n\n/, "");
    const updated = promptText + cleanContent;
    setContent(updated);
    setInsertFlight(true);
    codexAudio.playPenScratch();
    setTimeout(() => setInsertFlight(false), 950);
    setTimeout(() => {
      const el = isBookOpen ? bookContentRef.current : contentRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(promptText.length, promptText.length);
      }
    }, 50);
  };

  const flipPage = (direction: -1 | 1) => {
    try {
      const current = new Date(selectedDate + "T00:00:00");
      current.setDate(current.getDate() + direction);
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, "0");
      const day = String(current.getDate()).padStart(2, "0");
      const newDate = `${year}-${month}-${day}`;
      setSelectedDate(newDate);
      codexAudio.playPageTurn();
      setIsFlipping(true);
      setTimeout(() => setIsFlipping(false), 380);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRectoMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCandlePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const stats = useMemo(() => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const chars = content.length;
    const readTime = Math.max(1, Math.ceil(words / 200));
    return { words, chars, readTime };
  }, [content]);

  const streakDays = useMemo(() => {
    let streak = 0;
    for (let i = 0; ; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (entries.find((e) => e.date === key && e.content)) streak++;
      else break;
    }
    return streak;
  }, [entries]);

  const moodStats = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach((e) => {
      const canonical = normalizeMood(e.mood);
      if (canonical) counts[canonical] = (counts[canonical] || 0) + 1;
    });
    return counts;
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchesSearch =
        !searchQuery.trim() ||
        e.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.gratitude?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const canonical = normalizeMood(e.mood);
      const matchesMood =
        moodFilter === "all" ||
        (moodFilter === "bookmarked" ? Boolean(e.bookmarked) : canonical === moodFilter);
      return matchesSearch && matchesMood;
    });
  }, [entries, searchQuery, moodFilter]);

  // Typography helper classes
  const getFontClass = (mode: FontMode) => {
    switch (mode) {
      case "serif":
        return "font-serif text-[18px] sm:text-[19px] italic tracking-wide text-stone-100";
      case "typewriter":
        return "font-typewriter text-[15px] sm:text-[15.5px] tracking-tight text-stone-200";
      case "handwriting":
        return "font-handwriting text-[21px] sm:text-[23px] font-medium tracking-wide text-amber-100";
      case "mono":
      default:
        return "font-mono text-[14px] sm:text-[14.5px] text-stone-200";
    }
  };

  const getPaperClass = (mode: PaperMode) => {
    switch (mode) {
      case "dotgrid":
        return "paper-mode-dotgrid";
      case "grid":
        return "paper-mode-grid";
      case "blank":
        return "paper-mode-blank";
      case "ruled":
      default:
        return "paper-mode-ruled";
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9FB] dark:bg-[#0B0B0F] text-stone-900 dark:text-stone-100 selection:bg-orange-500/25">
      <TopNav />

      <main className="pt-16 sm:pt-20 lg:pt-22 pb-32 lg:pb-16 px-3.5 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">

        {/* ━━━━━ HEADER BANNER: FIELD LOG ━━━━━ */}
        <div className="bg-gradient-to-r from-[#EA580C] via-[#C2410C] to-[#F59E0B] rounded-2xl sm:rounded-3xl p-6 sm:p-7 text-white relative overflow-hidden shadow-lg shadow-orange-600/25">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight">Daily Journal</h1>
                  <span className="text-[10px] font-mono tracking-widest text-amber-200 uppercase">DAILY NOTES & REFLECTIONS</span>
                </div>
              </div>
              <p className="text-white/90 text-xs sm:text-sm font-medium flex items-center gap-3 mt-1">
                <span>{entries.length} entries written</span>
                <span>•</span>
                <span className="flex items-center gap-1 font-bold text-amber-200 font-numeric">
                  <Flame className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
                  {streakDays}-day writing streak
                </span>
              </p>
            </div>

            {/* Date Picker, Sound Toggle & Open Book Trigger */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Soundscapes Toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = codexAudio.toggle();
                  setSoundActive(next);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all backdrop-blur-md active:scale-95 shadow-sm ${
                  soundActive
                    ? "bg-amber-400 text-stone-900 border-amber-300"
                    : "bg-black/25 hover:bg-black/40 text-white border-white/20"
                }`}
                title={soundActive ? "Typing sound: On" : "Typing sound: Muted"}
              >
                {soundActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 opacity-75" />}
                <span className="hidden sm:inline">{soundActive ? "Sound ON" : "Sound"}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsBookOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-black/25 hover:bg-black/40 border border-white/20 text-xs font-bold text-white transition-all backdrop-blur-md active:scale-95 shadow-sm"
                title="Open full book view (Esc to close)"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-300" />
                <span>Open Book View</span>
              </button>

              <div className="flex items-center gap-2 bg-black/25 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20">
                <Calendar className="w-4 h-4 text-amber-300" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-white text-xs sm:text-sm font-bold outline-none cursor-pointer [color-scheme:dark]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ━━━━━ VISCERAL MOOD PULSE BAR ━━━━━ */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {MOODS.map((m) => (
            <div
              key={m.key}
              className="bg-white dark:bg-[#121218] border border-stone-200/80 dark:border-[#272732] rounded-xl p-2.5 text-center shadow-xs transition-transform hover:-translate-y-0.5"
            >
              <div className="text-lg mb-0.5">{m.emoji}</div>
              <div className="text-sm font-extrabold font-display font-numeric text-stone-900 dark:text-white">
                {moodStats[m.key] || 0}
              </div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-stone-400 dark:text-zinc-500">{m.label}</div>
            </div>
          ))}
        </div>

        {/* ━━━━━ TWO COLUMN WORKSPACE ━━━━━ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT 8 COLS: TACTILE FIELD EDITOR */}
          <div className="lg:col-span-8 space-y-4">

            {/* 1. Visceral State Selection as Minted Seals */}
            <div className="bg-white dark:bg-[#121218] rounded-2xl border border-stone-200/80 dark:border-[#272732] p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500 dark:text-[#9090A0] uppercase tracking-wider block">
                  How are you feeling today?
                </span>
                {mood && (
                  <span className="text-xs font-bold text-[#EA580C] dark:text-[#F59E0B] flex items-center gap-1.5 font-display">
                    <span>{getMoodInfo(mood)?.emoji}</span>
                    <span>Feeling {getMoodInfo(mood)?.label}</span>
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {MOODS.map((m) => {
                  const isSelected = normalizeMood(mood) === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => {
                        setMood(m.key);
                        codexAudio.playWaxSeal();
                      }}
                      className={`group relative flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-200 select-none ${
                        isSelected
                          ? "scale-105 border-2 border-amber-400 bg-amber-500/10 dark:bg-amber-500/15 shadow-sm"
                          : "border border-stone-200 dark:border-[#272732] hover:bg-stone-50 dark:hover:bg-[#1A1A22]"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? "border border-dashed border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.45)] bg-amber-400/20"
                          : "border border-stone-300/40 dark:border-stone-700/50"
                      }`}>
                        <span className="text-xl filter drop-shadow-sm">{m.emoji}</span>
                      </div>
                      <span className={`text-[10.5px] font-bold ${
                        isSelected ? "text-amber-500 dark:text-amber-300" : "text-stone-700 dark:text-stone-300"
                      }`}>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Raw Prompt of the Day (Vellum Epigraph Card) */}
            <div className="bg-gradient-to-r from-[#EA580C]/10 via-[#F59E0B]/10 to-transparent border-l-4 border-l-[#EA580C] border-y border-r border-[#EA580C]/25 rounded-2xl p-4 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#EA580C] dark:text-[#F59E0B] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Prompt of the Day
                </span>
                <p className="text-xs sm:text-sm font-semibold font-serif italic text-stone-800 dark:text-stone-200 leading-relaxed">
                  &ldquo;{WRITING_PROMPTS[promptIndex]}&rdquo;
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleInsertPrompt}
                  className="px-2.5 py-1 text-[11px] font-bold bg-[#EA580C]/15 hover:bg-[#EA580C]/25 text-[#EA580C] dark:text-[#F59E0B] rounded-lg transition-colors flex items-center gap-1"
                >
                  <span>Insert</span>
                  <span>✍️</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPromptIndex((prev) => (prev + 1) % WRITING_PROMPTS.length);
                    codexAudio.playPageTurn();
                  }}
                  className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                  title="Next prompt"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 3. Physical Archival Field Notebook Folio Preview */}
            <div className="relative rounded-2xl sm:rounded-3xl border-2 border-stone-300/80 dark:border-[#2A2B36] bg-[#FCFAF7] dark:bg-[#13141B] folio-tome-spread overflow-hidden transition-all">

              {/* Physical Terracotta Bookmark Ribbon hanging from top */}
              <div
                onClick={() => {
                  const next = !isBookmarked;
                  setIsBookmarked(next);
                  codexAudio.playWaxSeal();
                }}
                className={`absolute -top-1 right-12 z-20 cursor-pointer w-5 bg-gradient-to-b from-[#EA580C] to-[#C2410C] rounded-b-sm shadow-md flex items-end justify-center pb-1 transition-all ${
                  isBookmarked ? "h-16 shadow-orange-600/50" : "h-9 hover:h-11"
                }`}
                title={isBookmarked ? "Bookmarked Entry" : "Click to Bookmark"}
              >
                {isBookmarked ? (
                  <span className="text-[8px] font-bold text-amber-200">✦</span>
                ) : (
                  <div className="w-1.5 h-1.5 border-b-2 border-r-2 border-amber-200/90 rotate-45" />
                )}
              </div>

              {/* Notebook Header Bar / Folio Controls */}
              <div className="flex items-center justify-between border-b border-stone-200/90 dark:border-[#272734] px-3.5 sm:px-5 py-2.5 bg-stone-100/85 dark:bg-[#181923]/95 backdrop-blur-md flex-wrap gap-2.5">
                {/* Left Toolbar: Text formatting */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => insertFormatting("**", "**")}
                    className="p-1.5 rounded-lg hover:bg-stone-200 dark:hover:bg-[#252532] text-stone-600 dark:text-stone-300 transition-colors"
                    title="Bold (**text**)"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting("*", "*")}
                    className="p-1.5 rounded-lg hover:bg-stone-200 dark:hover:bg-[#252532] text-stone-600 dark:text-stone-300 transition-colors"
                    title="Italic (*text*)"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting("- ")}
                    className="p-1.5 rounded-lg hover:bg-stone-200 dark:hover:bg-[#252532] text-stone-600 dark:text-stone-300 transition-colors"
                    title="List (- item)"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting("> ")}
                    className="p-1.5 rounded-lg hover:bg-stone-200 dark:hover:bg-[#252532] text-stone-600 dark:text-stone-300 transition-colors"
                    title="Blockquote (> quote)"
                  >
                    <Quote className="w-4 h-4" />
                  </button>
                </div>

                {/* Center Badge: Archival Tome Label */}
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold tracking-widest text-[#F59E0B] uppercase">
                    DAILY JOURNAL NOTEBOOK
                  </span>
                </div>

                {/* Right Toolbar: Telemetry & Open Book Trigger */}
                <div className="flex items-center gap-2.5">
                  <div className="hidden sm:flex items-center gap-2 text-xs font-mono tabular-nums text-stone-500 dark:text-stone-400">
                    <span>{stats.words} words</span>
                    <span>•</span>
                    <span>{stats.readTime}m read</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBookOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-[#EA580C] dark:text-[#F59E0B] text-xs font-bold border border-orange-500/25 transition-all active:scale-95 shadow-xs"
                    title="Open Full Book Pages Spread"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Open Book</span>
                  </button>
                </div>
              </div>

              {/* Physical Notebook Body */}
              <div className="flex relative min-h-[360px]">
                {/* Left Column: Spiral Wire Binding & Perforated Margin */}
                <div className="w-8 sm:w-11 bg-stone-100/90 dark:bg-[#0E0F15] border-r border-stone-300/80 dark:border-stone-800 flex flex-col justify-around py-5 items-center select-none flex-shrink-0 relative">
                  {/* Classic Crimson/Terracotta Red Margin Guide Line */}
                  <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-[#EA580C]/45 dark:bg-[#EA580C]/35" />

                  {/* Wire Spiral Coils */}
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-0.5 sm:gap-1 my-1.5 -ml-1 sm:-ml-1.5">
                      <div className="w-4 sm:w-5 h-2 rounded-full bg-gradient-to-r from-stone-400 via-stone-200 to-stone-400 dark:from-stone-600 dark:via-stone-300 dark:to-stone-700 shadow-sm border border-black/25" />
                      <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-stone-300 dark:bg-[#08080C] shadow-inner" />
                    </div>
                  ))}
                </div>

                {/* Right Column: Ruled Paper Sheet in Selected Font */}
                <div className="flex-1 flex flex-col p-4 sm:p-6 sm:pl-7 relative bg-[#FCFAF7] dark:bg-[#14151D]">
                  {/* Printed Vintage Notebook Header Line */}
                  <div className="flex items-center justify-between pb-3 mb-2 border-b border-stone-300 dark:border-stone-700/60 font-mono text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 select-none tracking-wider">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#EA580C] uppercase tracking-widest">DATE:</span>
                      <span className="font-semibold underline underline-offset-4 decoration-stone-300 dark:decoration-stone-700">
                        {formattedDateString}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#F59E0B] uppercase tracking-widest">MOOD:</span>
                      <span className="font-semibold">{mood ? `${getMoodInfo(mood)?.emoji} ${getMoodInfo(mood)?.label}` : "—"}</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-2">
                      <span className="text-stone-400 uppercase tracking-widest">ENTRY NO:</span>
                      <span className="font-bold font-numeric text-stone-700 dark:text-stone-300">#{String(entries.length + 1).padStart(3, '0')}</span>
                    </div>
                  </div>

                  {/* Textarea: Typing or clicking instantly opens the full book spread */}
                  <div className="relative flex-1">
                    <textarea
                      ref={contentRef}
                      value={content}
                      onFocus={() => setIsBookOpen(true)}
                      onChange={(e) => {
                        setContent(e.target.value);
                        codexAudio.playTypingSound(fontMode === "typewriter" ? "typewriter" : "pen");
                        if (!isBookOpen) {
                          setIsBookOpen(true);
                        }
                      }}
                      placeholder="Click or start typing to write your journal entry..."
                      className={`w-full min-h-[300px] sm:min-h-[360px] bg-transparent outline-none p-1 sm:p-2 text-sm sm:text-base leading-[2.25rem] resize-none transition-all placeholder:text-stone-400/80 dark:placeholder:text-stone-600 folio-recto-editor ${getPaperClass(paperMode)} ${getFontClass(fontMode)} cursor-pointer`}
                    />
                  </div>

                  {/* Notebook Bottom Page Stamp */}
                  <div className="pt-3 mt-2 border-t border-stone-200 dark:border-stone-800/80 flex items-center justify-between text-[10px] font-mono text-stone-400 select-none">
                    <span className="tracking-widest uppercase">DAILY JOURNAL</span>
                    <span className="tabular-nums font-numeric">{stats.words} words • {stats.chars} characters</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Gratitude & Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-[#121218] rounded-2xl border border-stone-200/80 dark:border-[#272732] p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-500 dark:text-[#9090A0] uppercase tracking-wider block">
                    🌿 3 Things I&apos;m Grateful For
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!gratitude.trim()) {
                        setGratitude("1. A good moment today\n2. Something that made me smile\n3. Progress on my goals");
                      } else {
                        setGratitude((prev) => prev + "\n- ");
                      }
                      codexAudio.playPenScratch();
                    }}
                    className="text-[10px] font-bold text-[#EA580C] dark:text-[#F59E0B] hover:underline"
                  >
                    + 3 Lines
                  </button>
                </div>
                <textarea
                  value={gratitude}
                  onChange={(e) => {
                    setGratitude(e.target.value);
                    codexAudio.playTypingSound(fontMode === "typewriter" ? "typewriter" : "pen");
                  }}
                  placeholder="1. A good moment today&#10;2. Something that made me smile&#10;3. Progress on my goals"
                  className="w-full min-h-[105px] rounded-xl border border-stone-200/80 dark:border-[#272732] bg-[#FAF8F5] dark:bg-[#14151D] paper-mode-ruled folio-recto-editor p-3 text-xs sm:text-sm text-stone-800 dark:text-stone-200 outline-none focus:ring-2 focus:ring-orange-500/20 transition-all resize-none placeholder:text-stone-400 font-serif italic"
                />
              </div>

              <div className="bg-white dark:bg-[#121218] rounded-2xl border border-stone-200/80 dark:border-[#272732] p-4 shadow-xs space-y-2.5">
                <span className="text-xs font-bold text-stone-500 dark:text-[#9090A0] uppercase tracking-wider block">
                  🏷️ Tags
                </span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                    placeholder="e.g. work, health, goals"
                    className="flex-1 rounded-xl border border-stone-200 dark:border-[#272732] bg-stone-50 dark:bg-[#1A1A22] px-3 py-1.5 text-xs outline-none focus:border-[#EA580C] font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-[#EA580C] to-[#C2410C] text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-transform"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-orange-500/10 text-[#EA580C] dark:text-[#F59E0B] text-[11px] font-bold border border-orange-500/20 font-mono"
                    >
                      #{t}
                      <button onClick={() => handleRemoveTag(t)} className="hover:text-orange-400">×</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Save CTA */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 bg-gradient-to-r from-[#EA580C] to-[#C2410C] hover:brightness-110 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-orange-600/25 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving entry...</span>
                  </>
                ) : saveStatus === "saved" ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Journal Entry Saved!</span>
                  </>
                ) : (
                  <>
                    <span>Save Journal Entry</span>
                  </>
                )}
              </button>

              {entries.some((e) => e.date === selectedDate) && (
                <button
                  onClick={() => handleDeleteEntry(selectedDate)}
                  className="p-3 rounded-xl border border-stone-200 dark:border-[#272732] text-stone-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  title="Delete this entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* RIGHT 4 COLS: ARCHIVE */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white dark:bg-[#121218] rounded-2xl border border-stone-200/80 dark:border-[#272732] p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold font-heading">Past Entries</h3>
                <span className="text-xs text-stone-400 font-semibold">{filteredEntries.length} found</span>
              </div>

              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search entries..."
                  className="w-full rounded-xl border border-stone-200 dark:border-[#272732] bg-stone-50 dark:bg-[#1A1A22] pl-8 pr-3 py-2 text-xs outline-none focus:border-[#EA580C] font-mono"
                />
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>

              {/* Filter Pills with Starred Bookmarked entries */}
              <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
                <button
                  onClick={() => setMoodFilter("all")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap ${
                    moodFilter === "all"
                      ? "bg-gradient-to-r from-[#EA580C] to-[#C2410C] text-white shadow-xs"
                      : "bg-stone-100 dark:bg-[#1A1A22] text-stone-500 dark:text-[#9090A0]"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setMoodFilter("bookmarked")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap flex items-center gap-1 ${
                    moodFilter === "bookmarked"
                      ? "bg-gradient-to-r from-[#EA580C] to-[#F59E0B] text-white shadow-xs"
                      : "bg-stone-100 dark:bg-[#1A1A22] text-stone-500 dark:text-[#9090A0]"
                  }`}
                >
                  <span>⭐</span>
                  <span>Starred</span>
                </button>
                {MOODS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMoodFilter(m.key)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap flex items-center gap-1 ${
                      moodFilter === m.key
                        ? "bg-gradient-to-r from-[#EA580C] to-[#C2410C] text-white shadow-xs"
                        : "bg-stone-100 dark:bg-[#1A1A22] text-stone-500"
                    }`}
                  >
                    <span>{m.emoji}</span>
                  </button>
                ))}
              </div>

              {/* Entry List */}
              <div className="space-y-2 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
                {filteredEntries.length === 0 ? (
                  <p className="text-center text-xs text-stone-400 py-8">No entries found.</p>
                ) : (
                  filteredEntries.map((e) => {
                    const moodItem = getMoodInfo(e.mood);
                    const isSelected = selectedDate === e.date;
                    const dateObj = new Date(e.date + "T00:00:00");
                    const dateLabel = dateObj.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      weekday: "short",
                    });

                    return (
                      <div
                        key={e.id}
                        onClick={() => {
                          setSelectedDate(e.date);
                          codexAudio.playPageTurn();
                        }}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? "bg-orange-500/10 border-[#EA580C]/50 shadow-xs"
                            : "bg-stone-50/50 dark:bg-[#1A1A22]/40 border-stone-100 dark:border-[#272732] hover:border-stone-200 dark:hover:border-[#383848]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                              {dateLabel}
                            </span>
                            {e.bookmarked && (
                              <span className="text-[10px] text-amber-400">★</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {moodItem && (
                              <span className="text-[10px] font-semibold text-stone-400 dark:text-[#9090A0]">
                                {moodItem.label}
                              </span>
                            )}
                            <span className="text-sm" title={moodItem?.label || "Entry"}>
                              {moodItem?.emoji || "📝"}
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-stone-500 dark:text-[#9090A0] line-clamp-2 leading-relaxed font-serif italic">
                          {e.content || "Empty entry"}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ━━━━━ FULL-PAGE OPEN BOOK SPREAD VIEW (CODEX RITUALIS // OPEN FOLIO) ━━━━━ */}
      {isBookOpen && (
        <div className="fixed inset-0 z-50 bg-[#07080B]/95 backdrop-blur-xl text-stone-100 flex flex-col p-2.5 sm:p-5 lg:p-7 overflow-y-auto animate-fadeIn custom-scrollbar">
          
          {/* Atmospheric Desk Top Bar */}
          <div className="max-w-6xl w-full mx-auto flex items-center justify-between pb-3 mb-3 border-b border-[#23262D] flex-wrap gap-2.5">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C] animate-pulse" />
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#F59E0B]" />
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#F59E0B]">
                  DAILY JOURNAL // BOOK VIEW
                </span>
                <span className="hidden sm:inline text-stone-500 text-xs">•</span>
                <span className="hidden sm:inline font-mono text-xs text-stone-300 font-semibold">{formattedDateString}</span>
              </div>
            </div>

            {/* Telemetry, Sound Toggle & Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Sound Toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = codexAudio.toggle();
                  setSoundActive(next);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-mono font-bold transition-all active:scale-95 ${
                  soundActive
                    ? "bg-amber-500/25 border-amber-400/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                    : "bg-[#14161C] border-[#2B2F38] text-stone-400 hover:text-stone-200"
                }`}
                title={soundActive ? "Typing sound: On" : "Typing sound: Muted"}
              >
                {soundActive ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{soundActive ? "Sound ON" : "Sound"}</span>
              </button>

              <div className="hidden md:flex items-center gap-2 text-xs font-mono text-stone-400 tabular-nums">
                <span>{stats.words} words</span>
                <span>•</span>
                <span>{stats.readTime}m read</span>
                <span>•</span>
                <span className={saveStatus === "saved" ? "text-emerald-400 font-bold" : "text-stone-400"}>
                  {saving ? "Saving..." : saveStatus === "saved" ? "Saved ✓" : "Draft saved"}
                </span>
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#EA580C] to-[#C2410C] hover:brightness-110 active:scale-95 text-xs font-bold text-white shadow-md shadow-orange-600/30 transition-all flex items-center gap-1.5"
              >
                {saving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : saveStatus === "saved" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                ) : null}
                <span>{saving ? "Saving..." : saveStatus === "saved" ? "Saved!" : "Save Entry"}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsBookOpen(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#14161C] border border-[#2B2F38] text-xs font-bold text-stone-300 hover:text-white hover:border-stone-500 transition-colors"
                title="Close Book Spread (or press Esc)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Close Book (Esc)</span>
              </button>
            </div>
          </div>

          {/* Mobile Page Selector (Shown only on small screens < lg) */}
          <div className="lg:hidden max-w-6xl w-full mx-auto flex items-center justify-center mb-3">
            <div className="flex items-center bg-[#14151D] p-1 rounded-xl border border-[#272734] text-xs font-bold">
              <button
                type="button"
                onClick={() => setMobileBookPage("left")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  mobileBookPage === "left" ? "bg-[#252636] text-[#F59E0B] shadow-xs" : "text-stone-400"
                }`}
              >
                📖 Page 1: Mood & Gratitude
              </button>
              <button
                type="button"
                onClick={() => setMobileBookPage("right")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  mobileBookPage === "right" ? "bg-[#252636] text-[#EA580C] shadow-xs" : "text-stone-400"
                }`}
              >
                ✍️ Page 2: Notes & Writing
              </button>
            </div>
          </div>

          {/* Centered Hardcover Open Tome Spread with Stacked Pages */}
          <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col my-auto py-1 sm:py-2">
            <div
              ref={bookContainerRef}
              className={`relative flex-1 flex flex-col rounded-2xl sm:rounded-3xl border-4 sm:border-8 border-[#26170E] dark:border-[#1A110B] bg-[#26170E] dark:bg-[#1A110B] folio-tome-spread p-1.5 sm:p-2.5 transition-transform duration-300 ${
                isFlipping ? "scale-[0.99] -rotate-y-1" : ""
              }`}
            >
              
              {/* Interactive Terracotta Silk Bookmark Ribbon */}
              <button
                type="button"
                onClick={() => {
                  const next = !isBookmarked;
                  setIsBookmarked(next);
                  codexAudio.playWaxSeal();
                  if (user) {
                    setDoc(doc(db, "users", user.uid, "journal", selectedDate), { bookmarked: next }, { merge: true }).catch(console.error);
                  }
                }}
                className={`absolute -top-3 left-1/2 -translate-x-1/2 z-35 group cursor-pointer transition-all duration-300 ease-out flex flex-col items-center ${
                  isBookmarked ? "h-24 sm:h-26" : "h-14 hover:h-17"
                }`}
                title={isBookmarked ? "✦ Starred Entry (Click to remove star)" : "Click ribbon to star this entry"}
              >
                <div className="w-5 sm:w-6 flex-1 bg-gradient-to-b from-[#EA580C] via-[#C2410C] to-[#9A3412] shadow-xl flex items-end justify-center pb-1.5 rounded-b-xs border-x border-amber-500/40 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(255,255,255,0.4)_2px,rgba(255,255,255,0.4)_3px)] pointer-events-none" />
                  {isBookmarked ? (
                    <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 border border-amber-200 shadow-md flex items-center justify-center text-[9px] font-bold text-amber-950 animate-pulse">
                      ✦
                    </div>
                  ) : (
                    <div className="w-2 h-2 border-b-2 border-r-2 border-amber-200/90 rotate-45 group-hover:scale-110 transition-transform" />
                  )}
                </div>
                {isBookmarked && (
                  <span className="text-[7.5px] font-mono font-bold tracking-widest text-amber-300 uppercase mt-0.5 bg-black/80 px-1 py-0.2 rounded border border-amber-500/30 shadow-xs">
                    STARRED
                  </span>
                )}
              </button>

              {/* Facing Two-Page Book Spread Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 rounded-xl sm:rounded-2xl overflow-hidden relative shadow-inner bg-[#FAF7F2] dark:bg-[#13141C] text-stone-900 dark:text-stone-100">
                
                {/* Archival Paper Grain Overlay (feTurbulence) */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.035] mix-blend-overlay z-20 overflow-hidden">
                  <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <filter id="parchment-noise-filter">
                      <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" stitchTiles="stitch" />
                      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.55 0" />
                    </filter>
                    <rect width="100%" height="100%" filter="url(#parchment-noise-filter)" />
                  </svg>
                </div>

                {/* Center Spine Crease Gutter Overlay (Desktop) */}
                <div className="hidden lg:block folio-spine-gutter" />

                {/* ════════ LEFT PAGE (VERSO) ════════ */}
                <div
                  className={`p-5 sm:p-7 lg:pr-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-stone-300/70 dark:border-stone-800 bg-[#FAF7F2] dark:bg-[#12131A] relative ${
                    mobileBookPage === "left" ? "flex" : "hidden lg:flex"
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header: Vintage Book Stamp */}
                    <div className="flex items-center justify-between pb-3 border-b border-stone-300/80 dark:border-stone-800 font-mono text-[11px] text-stone-500 dark:text-stone-400 select-none">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#EA580C]" />
                        <span className="font-bold tracking-widest text-[#EA580C] uppercase">PAGE 1</span>
                      </div>
                      <div className="font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                        {formattedDateString}
                      </div>
                    </div>

                    {/* 1. Visceral State Selector as Minted Wax Impressions */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-stone-500 dark:text-stone-400">
                          HOW ARE YOU FEELING TODAY?
                        </span>
                        {mood && (
                          <span className="text-[11px] font-bold text-[#EA580C] dark:text-[#F59E0B]">
                            {getMoodInfo(mood)?.emoji} {getMoodInfo(mood)?.label}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {MOODS.map((m) => {
                          const isSelected = normalizeMood(mood) === m.key;
                          return (
                            <button
                              key={m.key}
                              type="button"
                              onClick={() => {
                                setMood(m.key);
                                codexAudio.playWaxSeal();
                              }}
                              className={`group relative flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all select-none ${
                                isSelected
                                  ? "scale-104 -rotate-1 border-2 border-amber-400/90 bg-gradient-to-b from-amber-500/20 via-orange-950/30 to-black/50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.25),inset_0_-2px_4px_rgba(0,0,0,0.5),0_6px_14px_rgba(234,88,12,0.35)]"
                                  : "border border-stone-200 dark:border-[#272732] hover:bg-stone-100/70 dark:hover:bg-[#1B1B24] text-stone-600 dark:text-stone-400 opacity-80 hover:opacity-100"
                              }`}
                            >
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                                isSelected
                                  ? "border border-dashed border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.5)] bg-amber-400/25"
                                  : "border border-stone-400/30 dark:border-stone-700/40"
                              }`}>
                                <span className="text-xl filter drop-shadow-sm">{m.emoji}</span>
                              </div>
                              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                                isSelected ? "text-amber-300" : "text-stone-500 dark:text-stone-400"
                              }`}>{m.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Vellum Epigraph Prompt Card */}
                    <div className="relative rounded-xl border-l-4 border-[#EA580C] bg-gradient-to-r from-amber-950/20 via-stone-900/30 to-transparent p-3.5 space-y-2 backdrop-blur-xs shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#EA580C] dark:text-[#F59E0B] flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Prompt of the Day
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handleInsertPrompt}
                            className="px-2 py-0.5 text-[10px] font-bold bg-[#EA580C]/15 hover:bg-[#EA580C]/30 text-[#EA580C] dark:text-[#F59E0B] rounded border border-orange-500/25 transition-all active:scale-95"
                          >
                            Use Prompt ✍️
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPromptIndex((prev) => (prev + 1) % WRITING_PROMPTS.length);
                              codexAudio.playPageTurn();
                            }}
                            className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                            title="Next prompt"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs font-serif italic text-stone-700 dark:text-stone-300 leading-relaxed">
                        &ldquo;{WRITING_PROMPTS[promptIndex]}&rdquo;
                      </p>
                    </div>

                    {/* 3. Baseline-Ruled Gratitudes (Directly on Page Surface) */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-stone-500 dark:text-stone-400">
                          🌿 3 THINGS I&apos;M GRATEFUL FOR
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (!gratitude.trim()) {
                              setGratitude("1. A good moment today\n2. Something that made me smile\n3. Progress on my goals");
                            } else {
                              setGratitude((prev) => prev + "\n- ");
                            }
                            codexAudio.playPenScratch();
                          }}
                          className="text-[10px] font-bold text-[#EA580C] dark:text-[#F59E0B] hover:underline"
                        >
                          + 3 Lines
                        </button>
                      </div>
                      <div className="relative border-b border-stone-200 dark:border-stone-800 pb-1">
                        <textarea
                          value={gratitude}
                          onChange={(e) => {
                            setGratitude(e.target.value);
                            codexAudio.playTypingSound(fontMode === "typewriter" ? "typewriter" : "pen");
                          }}
                          placeholder="1. A good moment today&#10;2. Something that made me smile&#10;3. Progress on my goals"
                          rows={3}
                          className="w-full bg-transparent outline-none p-1 text-xs sm:text-sm text-stone-800 dark:text-stone-200 font-serif italic paper-mode-ruled folio-recto-editor resize-none"
                        />
                      </div>
                    </div>

                    {/* 4. Field Tags (Stamped Archival Badges) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-stone-500 dark:text-stone-400">
                          🏷️ TAGS
                        </span>
                        <span className="text-[10px] font-mono text-stone-400">{tags.length} tags</span>
                      </div>
                      <div className="flex items-center gap-2 border-b border-dashed border-amber-500/40 pb-1">
                        <span className="text-xs text-amber-500 font-mono">#</span>
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                          placeholder="Type tag and press Enter..."
                          className="flex-1 bg-transparent text-xs font-mono text-stone-800 dark:text-stone-200 outline-none placeholder:text-stone-500 placeholder:italic"
                        />
                        <button
                          type="button"
                          onClick={handleAddTag}
                          className="px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-500 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 rounded active:scale-95 transition-all"
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1 max-h-16 overflow-y-auto custom-scrollbar">
                        {tags.map((t, i) => (
                          <span
                            key={t}
                            style={{ transform: `rotate(${i % 2 === 0 ? -1 : 1}deg)` }}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-gradient-to-r from-stone-100 to-stone-200 dark:from-[#1E1F29] dark:to-[#171822] border border-stone-300 dark:border-amber-500/30 text-[#EA580C] dark:text-[#F59E0B] text-[10px] font-mono font-bold shadow-xs hover:border-amber-400 transition-transform"
                          >
                            <span>#{t}</span>
                            <button onClick={() => handleRemoveTag(t)} className="hover:text-red-400">×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Left Page Stamp & Corner Curl */}
                  <div className="pt-3 mt-4 border-t border-stone-200 dark:border-stone-800/80 flex items-center justify-between text-[10px] font-mono text-stone-400 select-none relative">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => flipPage(-1)}
                        className="hover:text-amber-400 flex items-center gap-1 transition-colors"
                        title="Flip to Yesterday"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>PREV DAY</span>
                      </button>
                      <span>PAGE 1 • MOOD & GRATITUDE</span>
                    </div>
                    <span>ENTRY #{String(entries.length + 1).padStart(3, "0")}</span>

                    {/* Dog-Ear Interactive Corner Curl */}
                    <div
                      onClick={() => flipPage(-1)}
                      className="page-corner-curl-left"
                      title="Go to Previous Day (←)"
                    />
                  </div>
                </div>

                {/* ════════ RIGHT PAGE (RECTO) ════════ */}
                <div
                  onMouseMove={handleRectoMouseMove}
                  className={`p-5 sm:p-7 lg:pl-10 flex flex-col bg-[#FCFAF7] dark:bg-[#14151D] relative overflow-hidden ${
                    mobileBookPage === "right" ? "flex" : "hidden lg:flex"
                  }`}
                >
                  {/* Candlelight Focus Aura */}
                  <div
                    className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-10"
                    style={{
                      background: `radial-gradient(550px circle at ${candlePos.x}px ${candlePos.y}px, rgba(245, 158, 11, 0.055), transparent 70%)`,
                    }}
                  />

                  {/* Header: Vintage Header, Pen Selector & Paper Mode Toggle */}
                  <div className="relative z-20 flex items-center justify-between pb-3 mb-2 border-b border-stone-300 dark:border-stone-700/60 font-mono text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 select-none flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#EA580C] uppercase tracking-widest">PAGE 2:</span>
                      <span className="font-semibold underline underline-offset-4 decoration-stone-300 dark:decoration-stone-700">
                        {formattedDateString}
                      </span>
                    </div>

                    {/* Center: Formatting Toolbar + Writing Instrument Switcher */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Markdown Toolbar */}
                      <div className="flex items-center gap-1 bg-stone-200/60 dark:bg-[#1C1D28] px-1.5 py-0.5 rounded-lg border border-stone-300/50 dark:border-stone-800">
                        <button
                          type="button"
                          onClick={() => insertFormatting("**", "**")}
                          className="p-1 rounded hover:bg-stone-300/60 dark:hover:bg-[#2A2B3A] text-stone-600 dark:text-stone-300 transition-colors"
                          title="Bold (**text**)"
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => insertFormatting("*", "*")}
                          className="p-1 rounded hover:bg-stone-300/60 dark:hover:bg-[#2A2B3A] text-stone-600 dark:text-stone-300 transition-colors"
                          title="Italic (*text*)"
                        >
                          <Italic className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => insertFormatting("- ")}
                          className="p-1 rounded hover:bg-stone-300/60 dark:hover:bg-[#2A2B3A] text-stone-600 dark:text-stone-300 transition-colors"
                          title="List (- item)"
                        >
                          <List className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => insertFormatting("> ")}
                          className="p-1 rounded hover:bg-stone-300/60 dark:hover:bg-[#2A2B3A] text-stone-600 dark:text-stone-300 transition-colors"
                          title="Blockquote (> quote)"
                        >
                          <Quote className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Pen & Font Nib Selector */}
                      <div className="flex items-center gap-1 bg-black/40 border border-amber-500/20 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setFontMode("serif");
                            codexAudio.playTypingSound("pen");
                            localStorage.setItem("codex_font_mode", "serif");
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                            fontMode === "serif" ? "bg-amber-500/30 text-amber-300 shadow-xs" : "text-stone-400 hover:text-stone-200"
                          }`}
                          title="Serif font"
                        >
                          <span>✒️</span>
                          <span className="hidden sm:inline font-serif italic">Serif</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFontMode("typewriter");
                            codexAudio.playTypingSound("typewriter");
                            localStorage.setItem("codex_font_mode", "typewriter");
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                            fontMode === "typewriter" ? "bg-amber-500/30 text-amber-300 shadow-xs" : "text-stone-400 hover:text-stone-200"
                          }`}
                          title="Typewriter font"
                        >
                          <span>⌨️</span>
                          <span className="hidden sm:inline font-typewriter">Type</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFontMode("handwriting");
                            codexAudio.playTypingSound("pen");
                            localStorage.setItem("codex_font_mode", "handwriting");
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                            fontMode === "handwriting" ? "bg-amber-500/30 text-amber-300 shadow-xs" : "text-stone-400 hover:text-stone-200"
                          }`}
                          title="Handwriting font"
                        >
                          <span>🖋️</span>
                          <span className="hidden sm:inline font-handwriting text-xs">Script</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFontMode("mono");
                            codexAudio.playTypingSound("typewriter");
                            localStorage.setItem("codex_font_mode", "mono");
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                            fontMode === "mono" ? "bg-amber-500/30 text-amber-300 shadow-xs" : "text-stone-400 hover:text-stone-200"
                          }`}
                          title="Monospace font"
                        >
                          <span>📟</span>
                          <span className="hidden sm:inline font-mono">Mono</span>
                        </button>
                      </div>
                    </div>

                    {/* Interactive Paper Surface Switcher */}
                    <button
                      type="button"
                      onClick={() => {
                        const modes: PaperMode[] = ["ruled", "dotgrid", "grid", "blank"];
                        const nextIdx = (modes.indexOf(paperMode) + 1) % modes.length;
                        const next = modes[nextIdx];
                        setPaperMode(next);
                        codexAudio.playPageTurn();
                        localStorage.setItem("codex_paper_mode", next);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-[10px] font-mono font-bold text-amber-300 transition-all active:scale-95 shadow-xs"
                      title="Click to change paper style"
                    >
                      <span>
                        {paperMode === "ruled" && "📏 RULED LINES"}
                        {paperMode === "dotgrid" && "⸪ DOT GRID"}
                        {paperMode === "grid" && "▦ GRID SQUARES"}
                        {paperMode === "blank" && "📜 BLANK PAPER"}
                      </span>
                    </button>
                  </div>

                  {/* Ruled Notebook Paper with Crimson Red Margin Line */}
                  <div className="relative flex-1 flex flex-col border-l-2 border-[#EA580C]/40 dark:border-[#EA580C]/30 pl-3 sm:pl-5 z-20">
                    <textarea
                      ref={bookContentRef}
                      autoFocus
                      value={content}
                      onChange={(e) => {
                        setContent(e.target.value);
                        codexAudio.playTypingSound(fontMode === "typewriter" ? "typewriter" : "pen");
                      }}
                      placeholder="Write about your day. What went well? What is on your mind?"
                      className={`w-full flex-1 bg-transparent outline-none p-1 text-sm sm:text-base leading-[2.25rem] resize-none transition-all placeholder:text-stone-400/70 dark:placeholder:text-stone-600 folio-recto-editor ${getPaperClass(paperMode)} ${getFontClass(fontMode)}`}
                    />

                    {/* Ink Curing Ambient Shimmer Overlay */}
                    {isInkCuring && <div className="animate-ink-curing" />}

                    {/* Archival Circular Codex Stamp */}
                    {showCodexStamp && (
                      <div className="absolute bottom-6 right-6 z-30 pointer-events-none select-none animate-codex-stamp">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-double border-amber-500/80 bg-amber-950/20 backdrop-blur-xs flex flex-col items-center justify-center p-1 text-center shadow-[0_0_16px_rgba(245,158,11,0.25)]">
                          <div className="w-full h-full rounded-full border border-dashed border-amber-400/60 flex flex-col items-center justify-center">
                            <span className="text-[7px] font-mono tracking-widest text-amber-400 uppercase font-black">
                              DAILY JOURNAL
                            </span>
                            <span className="text-base my-0.5">✦</span>
                            <span className="text-[6.5px] font-mono text-amber-300 font-bold tracking-wider uppercase">
                              SAVED & SEALED
                            </span>
                            <span className="text-[6px] font-mono text-amber-400/80 mt-0.5">
                              {selectedDate}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Page Footer & Dog-Ear Corner Curl */}
                  <div className="relative z-20 pt-3 mt-2 border-t border-stone-200 dark:border-stone-800/80 flex items-center justify-between text-[10px] font-mono text-stone-400 select-none">
                    <span className="tracking-widest uppercase">PAGE 2 • JOURNAL NOTES</span>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums font-numeric">{stats.words} words • {stats.chars} characters</span>
                      <button
                        type="button"
                        onClick={() => flipPage(1)}
                        className="hover:text-amber-400 flex items-center gap-1 transition-colors"
                        title="Go to Next Day"
                      >
                        <span>NEXT DAY</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Dog-Ear Interactive Corner Curl */}
                    <div
                      onClick={() => flipPage(1)}
                      className="page-corner-curl-right"
                      title="Go to Next Day (→)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
