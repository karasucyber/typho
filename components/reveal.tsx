"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type RevealProps = {
  as?: "article" | "div";
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function Reveal({ as = "div", children, className, delay = 0 }: RevealProps) {
  const Component = as === "article" ? motion.article : motion.div;

  return (
    <Component
      className={["reveal", className].filter(Boolean).join(" ")}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Component>
  );
}
