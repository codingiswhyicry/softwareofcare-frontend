import { ReactNode } from 'react'

type Props = { title?: string; children: ReactNode }

/** Practical next steps, usually after the chapter summary. */
export default function ImplementationPlan({
  title = 'Implementation plan',
  children,
  ...rest
}: Props) {
  return (
    <section
      className="border-primary-500 my-12 rounded-xl border-2 px-6 py-6 font-sans sm:px-8"
      {...rest}
    >
      <h2 className="text-goth-blueberry dark:text-primary-400 !my-0 text-sm font-semibold tracking-widest uppercase">
        {title}
      </h2>
      <div className="prose dark:prose-invert mt-3 max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        {children}
      </div>
    </section>
  )
}
