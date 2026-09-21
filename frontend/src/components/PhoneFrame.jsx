'use client'

import { motion } from 'framer-motion'

import Footer from './Footer'

// Every page in the app wraps its content in this "phone" card — previously
// each page hardcoded `w-[400px] h-[812px]`, which overflows on real small
// phones and looks like an accident floating in empty space on desktop.
// `min(400px, 100%)` / `min(812px, 100dvh)` keep the exact same 400x812 look
// on any screen that has room for it (basically all phones and every
// desktop), while shrinking gracefully instead of clipping when it doesn't.
export default function PhoneFrame({ children, className = '' }) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-4 p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className={`w-[min(400px,100%)] h-[min(812px,100dvh)] bg-white rounded-3xl shadow-lg overflow-hidden flex flex-col ${className}`}
      >
        {children}
      </motion.div>
      <Footer />
    </div>
  )
}
