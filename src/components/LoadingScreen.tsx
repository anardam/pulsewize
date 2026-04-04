"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  "Connecting to profile...",
  "Scraping profile data...",
  "Analyzing content patterns...",
  "Running NLP on captions...",
  "Checking trends in your niche...",
  "Generating AI growth strategy...",
  "Building your report...",
];

export default function LoadingScreen() {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setStep((s) => (s < STEPS.length - 1 ? s + 1 : s));
    }, 2800);

    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 3 + 0.5, 95));
    }, 200);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-[#0d0d0d] z-50 flex items-center justify-center">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, rgba(225, 70, 124, 0.06) 0%, transparent 50%)",
        }}
      />

      <div className="relative w-full max-w-sm px-6">
        {/* Animated orb */}
        <div className="flex justify-center mb-10">
          <div className="relative h-20 w-20">
            <motion.div
              className="absolute inset-0 rounded-full bg-rose-500/20 blur-xl"
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute inset-2 rounded-full bg-gradient-to-br from-rose-500 to-rose-600"
              animate={{ scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-rose-400/30"
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </div>

        {/* Step text */}
        <div className="text-center mb-8 h-12">
          <AnimatePresence mode="wait">
            <motion.p
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="text-sm text-[#e8e4df] font-medium"
            >
              {STEPS[step]}
            </motion.p>
          </AnimatePresence>
          <p className="text-xs text-[#5a5550] mt-2">
            Step {step + 1} of {STEPS.length}
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-rose-600 via-rose-500 to-rose-400"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
        <p className="text-center text-[10px] text-[#5a5550] mt-2 tabular-nums">
          {Math.round(progress)}%
        </p>
      </div>
    </div>
  );
}
