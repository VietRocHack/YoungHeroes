'use client'

import { motion } from 'framer-motion'

// Drop-in replacement for <button> that adds consistent tap/hover feedback
// app-wide, without touching any existing Tailwind classes/colors.
export default function MotionButton({ children, className = '', disabled = false, ...props }) {
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.03 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className={className}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  )
}
