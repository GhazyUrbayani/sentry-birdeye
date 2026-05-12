'use client';

import { useEffect, useState } from 'react';

export function MouseGradient() {
  const [position, setPosition] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate percentage
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setPosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      className="pointer-events-none fixed inset-0 z-[-1] transition-transform duration-75 ease-out opacity-60"
      style={{
        background: `radial-gradient(800px circle at ${position.x}% ${position.y}%, rgba(16, 185, 129, 0.15), rgba(14, 165, 233, 0.05), transparent 50%)`,
      }}
    />
  );
}
