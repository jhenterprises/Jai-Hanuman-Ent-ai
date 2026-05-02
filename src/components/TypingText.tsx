import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface TypingTextProps {
  text: string;
  className?: string;
}

const TypingText: React.FC<TypingTextProps> = ({ text, className = "" }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[index]);
        setIndex((prev) => prev + 1);
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [index, text]);

  return (
    <span className={className}>
      {displayedText}
      <motion.span
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 0.8, repeat: Infinity }}
        className="inline-block w-1 h-8 bg-blue-500 ml-1 align-middle"
      />
    </span>
  );
};

export default TypingText;
