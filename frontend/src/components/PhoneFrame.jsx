'use client'

import { motion } from 'framer-motion'

import Footer from './Footer'

// Every page in the app wraps its content in this "phone" card. On sm:+
// screens it's a simulated phone — a fixed ~400x812 card with a clipped,
// fixed-height interior, floating on a gray backdrop — since the point there
// is to look like a phone. On an actual phone that simulation is pointless
// and actively harmful: the fixed height + overflow-hidden clips any content
// taller than 812px instead of letting the page scroll. Below sm:, this
// renders full-bleed with no card, no backdrop, and natural page scroll —
// the real device already is the frame.
export default function PhoneFrame({ children, className = '' }) {
  return (
    <div className="min-h-screen bg-white sm:bg-gray-100 flex flex-col sm:items-center sm:justify-center gap-4 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className={`relative w-full min-h-screen sm:min-h-0 sm:w-[min(400px,100%)] sm:h-[min(812px,100dvh)] bg-white sm:rounded-3xl sm:shadow-lg sm:overflow-hidden flex flex-col ${className}`}
      >
        {children}
      </motion.div>
      <Footer />
    </div>
  )
}
