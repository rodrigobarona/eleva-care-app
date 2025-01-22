"use client";

import type React from "react";
import { motion } from "motion/react";

const variants = {
  hidden: {
    opacity: 0,
    y: 50,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: "easeOut",
    },
  },
};

const FadeInSection: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={variants}
      style={{
        willChange: "transform, opacity",
      }}
    >
      {children}
    </motion.div>
  );
};

export default FadeInSection;
