import { ReactNode } from 'react'

const variants = {
  note: { label: 'Note', className: 'border-ice bg-frost/60 dark:bg-gray-900/60' },
  key: { label: 'Key idea', className: 'border-sequim bg-primary-300/25 dark:bg-sequim/10' },
  warning: {
    label: 'Watch out',
    className: 'border-goth-blueberry bg-gray-200/60 dark:border-frost dark:bg-gray-800/60',
  },
  example: { label: 'Example', className: 'border-primary-600 bg-gray-50/80 dark:bg-gray-900/60' },
  reflect: {
    label: 'Reflect',
    className: 'border-sequim border-dashed bg-primary-300/15 dark:bg-sequim/5',
  },
}

type Props = {
  type?: keyof typeof variants
  title?: string
  children: ReactNode
}

export default function Callout({ type = 'note', title, children, ...rest }: Props) {
  const variant = variants[type] ?? variants.note
  return (
    <aside
      className={`my-8 rounded-r-lg border-l-4 px-6 py-5 font-sans ${variant.className}`}
      {...rest}
    >
      <p className="!my-0 text-xs font-semibold tracking-widest text-gray-600 uppercase dark:text-gray-300">
        {variant.label}
      </p>
      {title && (
        <p className="!mt-1 !mb-0 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </p>
      )}
      <div className="prose dark:prose-invert mt-2 max-w-none text-[0.95rem] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        {children}
      </div>
    </aside>
  )
}
