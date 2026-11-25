import { ReactNode } from 'react'

type Props = { title?: string; children: ReactNode }

/** "This chapter covers" box at the start of a chapter. */
export default function ChapterOverview({
  title = 'This chapter covers',
  children,
  ...rest
}: Props) {
  return (
    <section
      className="my-10 border-y border-gray-200 py-6 font-sans dark:border-gray-700"
      {...rest}
    >
      <h2 className="text-goth-blueberry dark:text-primary-400 !my-0 text-xs font-semibold tracking-widest uppercase">
        {title}
      </h2>
      <div className="prose dark:prose-invert mt-3 max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        {children}
      </div>
    </section>
  )
}
