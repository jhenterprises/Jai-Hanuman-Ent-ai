import React from 'react';
import { motion } from 'motion/react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = "", hover = true }) => {
  return (
    <motion.div
      whileHover={hover ? { 
        y: -10, 
        scale: 1.02,
        boxShadow: "0 20px 40px rgba(59, 130, 246, 0.2)",
        borderColor: "rgba(59, 130, 246, 0.4)"
      } : {}}
      className={`
        relative overflow-hidden
        bg-white/40 dark:bg-white/5 backdrop-blur-xl
        border border-black/5 dark:border-white/10 rounded-[2rem]
        transition-all duration-300
        ${className}
      `}
    >
      {/* Subtle inner glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
};

export default GlassCard;
