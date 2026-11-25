import { ReactNode } from 'react'

type Props = { title?: string; children: ReactNode }

export default function ChapterSummary({ title = 'Chapter summary', children, ...rest }: Props) {
  return (
    <section
      className="my-12 rounded-xl border border-gray-200 bg-gray-50 px-6 py-6 font-sans sm:px-8 dark:border-gray-700 dark:bg-gray-900"
      {...rest}
    >
      <h2 className="!my-0 text-sm font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
        {title}
      </h2>
      <div className="prose dark:prose-invert mt-3 max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        {children}
      </div>
    </section>
  )
}
