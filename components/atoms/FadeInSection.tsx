"use client";

import React from "react";
import { motion } from "motion/react";

const containerVariants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.2, // Stagger children animations by 0.2s
    },
  },
};

const itemVariants = {
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

interface FadeInSectionProps {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean; // If true, will animate the direct child instead of wrapping in a div
}

const FadeInSection: React.FC<FadeInSectionProps> = ({
  children,
  className = "",
  asChild = false,
}) => {
  const Component = asChild ? motion.section : motion.div;

  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={containerVariants}
      className={className}
      style={{
        willChange: "transform, opacity",
      }}
    >
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;

        // Use child's key if available, otherwise fallback to a generated key
        const elementKey =
          child.key || `fade-${Math.random().toString(36).substr(2, 9)}`;

        return (
          <motion.div key={elementKey} variants={itemVariants}>
            {child}
          </motion.div>
        );
      })}
    </Component>
  );
};

export default FadeInSection;
