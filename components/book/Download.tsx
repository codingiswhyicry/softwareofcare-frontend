type Props = { href: string; title: string; description?: string; format?: string }

export default function Download({ href, title, description, format, ...rest }: Props) {
  return (
    <a
      href={href}
      download
      className="not-prose hover:border-primary-500 my-6 flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-5 py-4 font-sans no-underline transition-colors dark:border-gray-700"
      {...rest}
    >
      <span>
        <span className="block font-semibold text-gray-900 dark:text-gray-100">{title}</span>
        {description && (
          <span className="block text-sm text-gray-600 dark:text-gray-400">{description}</span>
        )}
      </span>
      <span className="text-goth-blueberry dark:text-primary-400 shrink-0 text-sm font-medium">
        Download{format ? ` ${format}` : ''} ↓
      </span>
    </a>
  )
}
