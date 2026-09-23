"use client";

import { motion } from "framer-motion";

const letters = [
  { path: "M12 18H70M41 18V82", x: -36, y: -18, thread: "M-75 45 Q-18 9 41 48" },
  { path: "M98 18 125 51 152 18M125 51V82", x: -18, y: 20, thread: "M-75 45 Q29 100 125 51" },
  { path: "M181 82V18H211L233 29V45L211 56H181", x: 12, y: -24, thread: "M-75 45 Q70 -3 202 46" },
  { path: "M264 18V82M310 18V82M264 50H310", x: 28, y: 16, thread: "M-75 45 Q117 108 287 50" },
  { path: "M357 18H383L400 35V65L383 82H357L340 65V35Z", x: 44, y: -14, thread: "M-75 45 Q195 -15 370 50" },
];

export function TyphoWordmark() {
  return (
    <svg viewBox="0 0 420 100" role="img" aria-label="Typho">
      <defs>
        <linearGradient id="typho-word-gradient" x1="12" y1="18" x2="400" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="0.52" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#EC4899" />
        </linearGradient>
        <linearGradient id="typho-thread-gradient" x1="-75" y1="45" x2="400" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3B82F6" stopOpacity="0.1" />
          <stop offset="0.45" stopColor="#7C6AF6" />
          <stop offset="1" stopColor="#B880FF" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <g className="wordmark-threads" fill="none" stroke="url(#typho-thread-gradient)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" aria-hidden="true">
        {letters.map(({ path, thread }, index) => (
          <motion.path
            className="wordmark-thread"
            key={path}
            d={thread}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: [0, 0.75, 0.75, 0] }}
            transition={{
              pathLength: { duration: 0.48, delay: 0.12 + index * 0.1, ease: "easeOut" },
              opacity: { duration: 0.95, delay: 0.12 + index * 0.1, times: [0, 0.2, 0.7, 1] },
            }}
          />
        ))}
      </g>
      <g fill="none" strokeLinecap="square" strokeLinejoin="miter">
        {letters.map(({ path, x, y }, index) => (
          <motion.g
            className="typho-letter"
            key={path}
            initial={{ x, y, opacity: 0 }}
            animate={{ x: 0, y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.57 + index * 0.1 }}
          >
            <path d={path} stroke="#263252" strokeWidth="10" />
            <path d={path} stroke="url(#typho-word-gradient)" strokeWidth="4.5" />
          </motion.g>
        ))}
        <motion.g
          className="wordmark-flash"
          stroke="url(#typho-word-gradient)"
          strokeWidth="4.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0, 0.75, 0] }}
          transition={{ duration: 0.65, delay: 1.35, times: [0, 0.15, 0.42, 1] }}
          aria-hidden="true"
        >
          {letters.map(({ path }) => <path key={path} d={path} />)}
        </motion.g>
      </g>
    </svg>
  );
}
