import type React from "react";
import { useState, useRef, useEffect } from "react";
import { useSpring, animated, config } from "@react-spring/web";

// Define the FadeInSection component with children type
const FadeInSection: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isVisible, setVisible] = useState(false);
  const domRef = useRef<HTMLDivElement>(null);
  const props = useSpring({
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? "translateY(0px)" : "translateY(50px)",
    config: config.molasses,
  });

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        setVisible(entry.isIntersecting);
      }
    });

    // Check if domRef.current is not null before observing
    if (domRef.current) {
      observer.observe(domRef.current);
    }

    const currentRef = domRef.current; // Store the current ref

    return () => {
      if (currentRef) {
        // Use the stored variable
        observer.unobserve(currentRef);
      }
    };
  }, []);

  return (
    <animated.div ref={domRef} style={props}>
      {children}
    </animated.div>
  );
};

export default FadeInSection;
