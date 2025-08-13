'use client';

import { cubicBezier } from 'motion';
import { motion, useInView } from 'motion/react';
import React, { useRef } from 'react';

// Motion best practice: Use the cubicBezier helper for custom easing
const smoothEasing = cubicBezier(0.22, 1, 0.36, 1);

const containerVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: smoothEasing, // Using proper Motion easing function
      staggerChildren: 0.2,
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
      ease: smoothEasing, // Consistent easing across components
    },
  },
};

interface FadeInSectionProps {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean; // If true, will animate the direct child instead of wrapping in a div
  delay?: number;
}

const FadeInSection: React.FC<FadeInSectionProps> = ({
  children,
  className = '',
  asChild = false,
  delay = 0,
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    margin: '0px 0px -20% 0px', // Trigger earlier, when element is 20% from viewport bottom
    amount: 0.3, // Show when 30% of the element is visible
    once: true,
  });

  const Component = asChild ? motion.section : motion.div;

  return (
    <Component
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        ...containerVariants,
        visible: {
          ...containerVariants.visible,
          transition: {
            ...containerVariants.visible.transition,
            delay,
          },
        },
      }}
      className={className}
      style={{
        willChange: 'transform, opacity',
        // Add hardware acceleration
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
      }}
    >
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;

        const elementKey = child.key || `fade-${Math.random().toString(36).substr(2, 9)}`;

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
