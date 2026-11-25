import { ReactNode } from 'react'

type Props = { caption?: string; source?: string; children: ReactNode }

/** Wraps a markdown table with a caption and source line. */
export default function DataTable({ caption, source, children, ...rest }: Props) {
  return (
    <figure className="my-10" {...rest}>
      {caption && (
        <figcaption className="mb-2 font-sans text-sm font-semibold text-gray-700 dark:text-gray-300">
          {caption}
        </figcaption>
      )}
      <div className="[&_table]:my-0">{children}</div>
      {source && (
        <p className="mt-2 font-sans text-xs text-gray-500 dark:text-gray-400">Source: {source}</p>
      )}
    </figure>
  )
}
