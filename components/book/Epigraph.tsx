import { ReactNode } from 'react'

type Props = { attribution?: string; children: ReactNode }

export default function Epigraph({ attribution, children, ...rest }: Props) {
  return (
    <div className="not-prose my-10 ml-auto max-w-md text-right" {...rest}>
      <div className="text-lg text-gray-700 italic dark:text-gray-300">{children}</div>
      {attribution && (
        <p className="mt-2 font-sans text-sm text-gray-500 dark:text-gray-400">— {attribution}</p>
      )}
    </div>
  )
}
