import React, { useRef, useState, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface ModernButtonProps {
  text: string;
  icon?: any;
  onClick?: () => void;
  className?: string;
  gradient?: string;
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  id?: string;
}

const ModernButton: React.FC<ModernButtonProps> = ({ 
  text, 
  icon: Icon, 
  onClick, 
  className = "", 
  gradient = "blue-gold-gradient",
  loading = false,
  disabled = false,
  type = 'button',
  id
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [iconColor, setIconColor] = useState('white');

  useLayoutEffect(() => {
    if (buttonRef.current) {
      const style = window.getComputedStyle(buttonRef.current);
      const bg = style.backgroundColor;
      const bgImage = style.backgroundImage;
      
      // Check for known gradients first
      if (gradient.includes('gold') && !gradient.includes('blue')) {
        setIconColor('black');
        return;
      }
      
      if (gradient.includes('blue') || gradient.includes('dark')) {
        setIconColor('white');
        return;
      }

      // Fallback to luminance check for solid colors
      const match = bg.match(/\d+/g);
      if (match && match.length >= 3) {
        const r = parseInt(match[0]);
        const g = parseInt(match[1]);
        const b = parseInt(match[2]);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        setIconColor(luminance > 0.5 ? 'black' : 'white');
      } else if (bgImage && bgImage !== 'none') {
        // If it's a gradient but not caught above, default to white for safety
        setIconColor('white');
      }
    }
  }, [gradient]);

  return (
    <motion.button
      ref={buttonRef}
      id={id || "modern-button"}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      whileHover={disabled || loading ? {} : { scale: 1.05, boxShadow: "0 0 25px rgba(59, 130, 246, 0.4)" }}
      whileTap={disabled || loading ? {} : { scale: 0.98 }}
      className={`
        relative px-8 py-4 ${gradient} ${className}
        rounded-[12px] shadow-xl
        flex items-center justify-center gap-3
        font-black transition-all duration-300
        group overflow-hidden
        ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{
        color: iconColor === 'white' ? 'white' : 'black'
      }}
    >
      {/* Animated background shine */}
      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shine_1.5s_ease-in-out_infinite] transition-transform" />
      
      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/5 blur-xl" />
      
      <span className="relative z-10">{loading ? 'Processing...' : text}</span>
      
      {loading ? (
        <div className="relative z-10 w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : Icon && (
        <motion.div
          className="relative z-10 flex items-center justify-center"
          initial={{ x: 0 }}
          whileHover={{ x: 5 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <Icon 
            size={22} 
            className="transition-colors duration-300"
            strokeWidth={2.5}
            style={{ color: iconColor }}
          />
        </motion.div>
      )}
    </motion.button>
  );
};

export default ModernButton;
