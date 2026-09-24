import { ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

// Universal back affordance: a circular icon button pinned to the top-left
// of the screen, used the same way on every page instead of each page
// inventing its own "Back"/"Cancel" button in its own place and style.
// Requires a `relative` ancestor to anchor to — PhoneFrame's card provides
// that automatically.
export default function BackButton({ to }) {
  const navigate = useNavigate()

  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      onClick={() => (to ? navigate(to) : navigate(-1))}
      aria-label="Back"
      className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-700"
    >
      <ArrowLeft size={20} />
    </motion.button>
  )
}
