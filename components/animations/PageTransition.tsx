"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

/*
 * PageTransition — per-route enter animation for Next.js App Router.
 *
 * Uses pathname as the key so Framer Motion re-triggers the enter
 * animation on every navigation. AnimatePresence mode="wait" ensures
 * the exit of the outgoing page completes before the new page enters.
 *
 * NOTE: filter: blur() is intentionally excluded from the variants —
 * blur forces per-pixel repaint on every animation frame and is
 * visibly janky on mid-range mobile GPUs. Opacity + y-offset only.
 */

const variants = {
  initial: { opacity: 0, y: 10 },
  enter:   { opacity: 1, y: 0,  transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.18, ease: "easeIn" } },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={variants}
        style={{ willChange: "opacity, transform" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}