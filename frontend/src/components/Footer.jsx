'use client'

export default function Footer() {
  return (
    <footer className="flex flex-col items-center text-xs text-gray-500 gap-1 pb-4 sm:pb-0">
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
