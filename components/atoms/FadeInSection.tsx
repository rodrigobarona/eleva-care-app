"use client";

import React from "react";
import { motion } from "motion/react";

const containerVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      when: "beforeChildren",
      duration: 0.5,
      ease: "easeOut",
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
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
      viewport={{
        once: true,
        amount: 0.1,
        margin: "100px 0px",
      }}
      variants={containerVariants}
      className={className}
      style={{
        willChange: "transform, opacity",
      }}
    >
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;

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
