import { genPageMetadata } from 'app/seo'
import siteMetadata from '@/data/siteMetadata'
import BookContents from '@/components/book/BookContents'
import ContinueReading from '@/components/book/ContinueReading'
import { getContents, getSequence } from '@/lib/book'

export const metadata = genPageMetadata({ title: 'Contents' })

export default function ContentsPage() {
  const sequence = getSequence()
  const first = sequence.find((entry) => entry.kind === 'chapter') ?? sequence[0]
  const minutes = sequence.reduce((total, entry) => total + entry.minutes, 0)

  return (
    <div className="mx-auto max-w-2xl py-12">
      <p className="text-goth-blueberry dark:text-primary-400 font-sans text-sm font-semibold tracking-widest uppercase">
        Contents
      </p>
      <h1 className="mt-3 text-4xl font-light tracking-tight text-gray-900 sm:text-5xl dark:text-gray-100">
        {siteMetadata.title}
      </h1>
      <p className="mt-4 font-sans text-sm text-gray-500 dark:text-gray-400">
        {siteMetadata.author} · about {Math.round(minutes / 60)} hours of reading
      </p>
      {first && (
        <div className="mt-8">
          <ContinueReading firstPath={first.path} />
        </div>
      )}
      <div className="mt-14 border-t border-gray-200 pt-10 dark:border-gray-700">
        <BookContents contents={getContents()} size="lg" />
      </div>
    </div>
  )
}
