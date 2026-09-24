import { AnimatePresence, motion } from 'framer-motion'
import { useLocation, useNavigationType } from 'react-router-dom'

// POP covers both back/forward browser navigation and navigate(-1) "Back"
// buttons; there's no way to tell those apart from navigationType alone, but
// in this app POP is only ever produced by an explicit Back button, so we
// treat it as "going back" and slide the opposite way from a normal PUSH.
const variants = {
  initial: (direction) => ({ opacity: 0, x: direction === 'back' ? -12 : 12 }),
  animate: { opacity: 1, x: 0 },
  exit: (direction) => ({ opacity: 0, x: direction === 'back' ? 12 : -12 }),
}

export default function PageTransition({ children }) {
  const location = useLocation()
  const direction = useNavigationType() === 'POP' ? 'back' : 'forward'

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={location.pathname}
        custom={direction}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
