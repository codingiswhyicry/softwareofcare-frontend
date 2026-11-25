'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getLastPosition, LastPosition } from '@/lib/reading-position'

/** "Continue reading" for returning readers; "Start reading" for everyone else. */
export default function ContinueReading({ firstPath }: { firstPath: string }) {
  const [last, setLast] = useState<LastPosition | null>(null)

  useEffect(() => {
    setLast(getLastPosition())
  }, [])

  const buttonClass =
    'bg-sequim hover:bg-primary-300 text-goth-blueberry inline-block rounded-full px-6 py-3 font-sans font-medium transition-colors'

  if (!last) {
    return (
      <Link href={firstPath} className={buttonClass}>
        Start reading →
      </Link>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 font-sans">
      <Link href={last.path} className={buttonClass}>
        Continue reading →
      </Link>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {last.label ? `${last.label}: ` : ''}
        <span className="text-gray-900 dark:text-gray-100">{last.title}</span>
        <span className="text-gray-400">
          {' '}
          · {Math.round(last.bookProgress * 100)}% through the book
        </span>
      </p>
      <Link href={firstPath} className="text-sm text-gray-500 underline-offset-4 hover:underline">
        Start from the beginning
      </Link>
    </div>
  )
}
