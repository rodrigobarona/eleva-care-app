'use client';

import { useEffect, useState } from 'react';
import ReactConfetti from 'react-confetti';

export function ConfettiCelebration() {
  const [show, setShow] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () =>
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    queueMicrotask(updateDimensions);

    const timer = setTimeout(() => setShow(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  if (!show || dimensions.width === 0) return null;

  return (
    <ReactConfetti
      width={dimensions.width}
      height={dimensions.height}
      recycle={false}
      numberOfPieces={400}
      wind={0.01}
      gravity={0.25}
      initialVelocityY={18}
      tweenDuration={100}
      style={{ position: 'fixed', top: 0, left: 0, zIndex: 50, pointerEvents: 'none' }}
    />
  );
}
