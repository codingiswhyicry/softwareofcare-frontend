import siteMetadata from '@/data/siteMetadata'
import BookContents from '@/components/book/BookContents'
import ContinueReading from '@/components/book/ContinueReading'
import { getContents, getSequence } from '@/lib/book'

export default function Home() {
  const sequence = getSequence()
  const first = sequence.find((entry) => entry.kind === 'chapter') ?? sequence[0]

  return (
    <div className="mx-auto max-w-2xl">
      <section className="py-16 sm:py-24">
        <h1 className="text-5xl font-light tracking-tight text-gray-900 sm:text-7xl dark:text-gray-100">
          {siteMetadata.title}
        </h1>
        <p className="mt-6 text-xl text-gray-600 dark:text-gray-400">{siteMetadata.description}</p>
        <p className="mt-2 font-sans text-sm text-gray-500">by {siteMetadata.author}</p>
        {first && (
          <div className="mt-10">
            <ContinueReading firstPath={first.path} />
          </div>
        )}
      </section>
      <section className="border-t border-gray-200 py-12 dark:border-gray-700">
        <h2 className="mb-8 font-sans text-sm font-semibold tracking-widest text-gray-500 uppercase">
          Contents
        </h2>
        <BookContents contents={getContents()} size="lg" />
      </section>
    </div>
  )
}
