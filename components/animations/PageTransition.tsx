"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

const variants = {
  initial: { opacity: 0, y: 12, filter: "blur(3px)" },
  enter:   {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: "blur(2px)",
    transition: { duration: 0.2, ease: "easeIn" },
  },
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
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
