'use client'

// Only shown on wider screens: the mobile "phone card" experience stays
// exactly as it was, this just gives the desktop view something intentional
// around the card instead of empty gray space.
export default function Footer() {
  return (
    <footer className="hidden sm:flex flex-col items-center text-xs text-gray-500 gap-1">
      <p>
        {'© '}
        {new Date().getFullYear()}{' '}
        <a
          href="https://vietrochack.com"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-gray-700"
        >
          VietRocHack
        </a>
      </p>
      <a
        href="https://devpost.com/software/young-heroes-hmi2vl"
        target="_blank"
        rel="noreferrer"
        className="underline hover:text-gray-700"
      >
        View on Devpost
      </a>
    </footer>
  )
}
