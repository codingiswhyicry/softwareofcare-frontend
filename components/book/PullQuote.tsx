import { ReactNode } from 'react'

export default function PullQuote({ children, ...rest }: { children: ReactNode }) {
  return (
    <blockquote
      className="not-prose border-primary-500 my-12 border-y-2 py-6 text-center text-2xl leading-snug font-medium text-gray-900 dark:text-gray-100"
      {...rest}
    >
      {children}
    </blockquote>
  )
}
