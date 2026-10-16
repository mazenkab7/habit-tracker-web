"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Flame, Sparkles, Brain, Code2, Dumbbell } from "lucide-react";
import { soundFX } from "@/lib/soundEffects";
import { triggerCanvasBurst } from "@/components/landing/ScrollWorldCanvas";

interface LiveHabit {
  id: string;
  name: string;
  category: string;
  icon: React.ReactNode;
  streak: number;
  completed: boolean;
  color: string;
}

const INITIAL_HABITS: LiveHabit[] = [
  {
    id: "habit-1",
    name: "Dawn Breathwork & Mindfulness",
    category: "Mindset",
    icon: <Brain className="w-4 h-4 text-[#10B981]" />,
    streak: 14,
    completed: true,
    color: "#10B981",
  },
  {
    id: "habit-2",
    name: "Deep Architecture Sprint (90m)",
    category: "Focus",
    icon: <Code2 className="w-4 h-4 text-[#F59E0B]" />,
    streak: 31,
    completed: false,
    color: "#F59E0B",
  },
  {
    id: "habit-3",
    name: "5km Twilight Run & Hydration",
    category: "Energy",
    icon: <Dumbbell className="w-4 h-4 text-[#EA580C]" />,
    streak: 9,
    completed: false,
    color: "#EA580C",
  },
];

export default function LiveHabitLab() {
  const [habits, setHabits] = useState<LiveHabit[]>(INITIAL_HABITS);
  const [feedback, setFeedback] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const completedCount = habits.filter((h) => h.completed).length;
  const consistencyScore = Math.round((completedCount / habits.length) * 100);

  const toggleHabit = (id: string, index: number) => {
    setHabits((prev) =>
      prev.map((h, i) => {
        if (h.id === id) {
          const nextState = !h.completed;
          if (nextState) {
            soundFX.playStepChime(index + 1);
            triggerCanvasBurst();
            setFeedback(`Momentum ignited! Streak reached ${h.streak + 1} days 🔥`);
            setTimeout(() => setFeedback(null), 2500);
          } else {
            soundFX.playClick();
          }
          return {
            ...h,
            completed: nextState,
            streak: nextState ? h.streak + 1 : Math.max(0, h.streak - 1),
          };
        }
        return h;
      })
    );
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-4xl mx-auto select-none">
      {/* Dynamic Specular Glass Container */}
      <div className="relative rounded-3xl border border-[#272732] bg-[#121218]/90 backdrop-blur-2xl p-5 sm:p-8 shadow-2xl shadow-orange-950/20 overflow-hidden">
        {/* Subtle Ambient Underglow */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-[#EA580C]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-[#10B981]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#272732] pb-5 mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#EF4444]/80 shadow-xs" />
              <div className="w-3 h-3 rounded-full bg-[#F59E0B]/80 shadow-xs" />
              <div className="w-3 h-3 rounded-full bg-[#10B981]/80 shadow-xs" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-[#F59E0B] font-display">
                  Interactive Live Lab
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F59E0B]/15 text-[#F59E0B] font-bold border border-[#F59E0B]/30 animate-pulse">
                  Click to Test
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] font-normal mt-0.5">
                Try completing a habit below to see particle bursts and audio-visual feedback
              </p>
            </div>
          </div>

          {/* Real-time Telemetry Stats */}
          <div className="flex items-center gap-3 bg-[#0B0B0F]/90 px-3.5 py-1.5 rounded-2xl border border-[#272732]">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]" />
              <span className="text-xs font-bold text-white font-numeric">
                {habits.reduce((acc, h) => acc + h.streak, 0)} Total Days
              </span>
            </div>
            <div className="w-[1px] h-3.5 bg-[#272732]" />
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
              <span className="text-xs font-bold text-[#10B981] font-numeric">
                {consistencyScore}% Flow
              </span>
            </div>
          </div>
        </div>

        {/* Live Habit Cards Grid */}
        <div className="grid grid-cols-1 gap-3 relative z-10">
          {habits.map((habit, idx) => (
            <motion.div
              key={habit.id}
              whileHover={{ scale: 1.015, y: -2 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => toggleHabit(habit.id, idx)}
              role="button"
              tabIndex={0}
              className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center justify-between gap-4 ${
                habit.completed
                  ? "bg-gradient-to-r from-[#EA580C]/20 via-[#121218] to-[#121218] border-[#EA580C]/50 shadow-md shadow-orange-600/10"
                  : "bg-[#0B0B0F]/80 hover:bg-[#1A1A22] border-[#272732] hover:border-[#3A3A4A]"
              }`}
            >
              <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                {/* Category Icon Box */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300"
                  style={{
                    backgroundColor: habit.completed ? "rgba(234, 88, 12, 0.25)" : "rgba(255, 255, 255, 0.05)",
                    border: `1px solid ${habit.completed ? "rgba(234, 88, 12, 0.4)" : "rgba(255, 255, 255, 0.1)"}`,
                  }}
                >
                  {habit.icon}
                </div>

                {/* Info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4
                      className={`text-sm sm:text-base font-bold font-display truncate transition-colors ${
                        habit.completed ? "text-white line-through opacity-70" : "text-white"
                      }`}
                    >
                      {habit.name}
                    </h4>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-white/5 text-[#94A3B8]">
                      {habit.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 text-xs font-bold text-[#F59E0B] font-numeric">
                      <Flame className="w-3.5 h-3.5 fill-[#F59E0B]" />
                      <span>{habit.streak} Day Streak</span>
                    </div>
                    <span className="text-zinc-600 text-xs">•</span>
                    <span className="text-xs text-[#94A3B8] font-normal">Daily Target</span>
                  </div>
                </div>
              </div>

              {/* Interactive Checkbox Ring */}
              <div className="flex-shrink-0">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    habit.completed
                      ? "bg-gradient-to-tr from-[#EA580C] to-[#F59E0B] text-white shadow-lg shadow-orange-600/30 scale-105"
                      : "bg-[#121218] border-2 border-[#272732] hover:border-[#EA580C]/60 text-transparent"
                  }`}
                >
                  <Check
                    className={`w-5 h-5 stroke-[3] transition-transform duration-300 ${
                      habit.completed ? "scale-100" : "scale-0"
                    }`}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Dynamic Feedback Toast */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="mt-4 p-3 rounded-xl bg-gradient-to-r from-[#EA580C]/30 to-[#F59E0B]/20 border border-[#F59E0B]/40 flex items-center justify-center gap-2 text-xs font-bold text-[#F59E0B]"
            >
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>{feedback}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Progress Rail */}
        <div className="mt-6 pt-5 border-t border-[#272732] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#9090A0]">
          <span className="font-medium">
            Daily Progress: <strong className="text-white">{completedCount} of 3 completed</strong>
          </span>
          <div className="w-full sm:w-48 h-2 bg-[#0B0B0F] rounded-full overflow-hidden border border-[#272732]">
            <motion.div
              className="h-full bg-gradient-to-r from-[#EA580C] to-[#10B981]"
              initial={{ width: 0 }}
              animate={{ width: `${consistencyScore}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
