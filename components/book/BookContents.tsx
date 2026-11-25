'use client'

import { MouseEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import type { BookEntry, ContentsNode } from '@/lib/book'
import { ChapterPosition, getChapterPositions } from '@/lib/reading-position'

type Props = {
  contents: ContentsNode[]
  activeSlug?: string
  /** Show a chapter's sections under it when it is active. */
  showSections?: boolean
  /** Lets the reader scroll within already-loaded chapters instead of navigating. */
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, entry: BookEntry, hash?: string) => void
  size?: 'sm' | 'lg'
}

function ProgressMark({ position }: { position?: ChapterPosition }) {
  const progress = position?.maxProgress ?? 0
  if (progress >= 0.95) {
    return (
      <span className="text-goth-blueberry dark:text-primary-400 text-xs" aria-label="Finished">
        ✓
      </span>
    )
  }
  if (progress > 0.02) {
    return (
      <span className="text-xs text-gray-400 tabular-nums" aria-label="Progress">
        {Math.round(progress * 100)}%
      </span>
    )
  }
  return null
}

export default function BookContents({
  contents,
  activeSlug,
  showSections = false,
  onNavigate,
  size = 'sm',
}: Props) {
  const [positions, setPositions] = useState<Record<string, ChapterPosition>>({})

  useEffect(() => {
    setPositions(getChapterPositions())
  }, [activeSlug])

  const entryLink = (entry: BookEntry, emphasis: boolean) => {
    const active = entry.slug === activeSlug
    return (
      <div className="flex items-baseline justify-between gap-3">
        <Link
          href={entry.path}
          onClick={onNavigate ? (e) => onNavigate(e, entry) : undefined}
          aria-current={active ? 'location' : undefined}
          className={`hover:text-primary-500 ${
            active
              ? 'text-goth-blueberry dark:text-primary-400 font-semibold'
              : emphasis
                ? 'font-semibold text-gray-900 dark:text-gray-100'
                : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          {entry.label &&
            entry.kind === 'chapter' &&
            entry.label.toLowerCase() !== entry.title.toLowerCase() && (
              <span className="text-gray-400 dark:text-gray-500">
                {entry.label.replace(/^Chapter /, '')}.{' '}
              </span>
            )}
          {entry.kind === 'part' && entry.label ? `${entry.label}: ` : ''}
          {entry.title}
        </Link>
        {entry.kind === 'chapter' && <ProgressMark position={positions[entry.slug]} />}
      </div>
    )
  }

  const sections = (entry: BookEntry) =>
    showSections &&
    entry.slug === activeSlug &&
    entry.sections.length > 0 && (
      <ul className="mt-2 mb-1 space-y-1.5 border-l border-gray-200 pl-3 dark:border-gray-700">
        {entry.sections.map((section) => (
          <li key={section.url}>
            <Link
              href={`${entry.path}${section.url}`}
              onClick={onNavigate ? (e) => onNavigate(e, entry, section.url) : undefined}
              className="hover:text-primary-500 text-gray-500 dark:text-gray-400"
            >
              {section.title}
            </Link>
          </li>
        ))}
      </ul>
    )

  return (
    <nav
      aria-label="Book contents"
      className={`font-sans ${size === 'lg' ? 'text-base' : 'text-sm'}`}
    >
      <ol className={size === 'lg' ? 'space-y-8' : 'space-y-4'}>
        {contents.map((node) => (
          <li key={node.slug}>
            {entryLink(node, node.kind === 'part')}
            {size === 'lg' && node.summary && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{node.summary}</p>
            )}
            {sections(node)}
            {node.children.length > 0 && (
              <ol className={`mt-2 space-y-2 ${size === 'lg' ? 'pl-5' : 'pl-3'}`}>
                {node.children.map((child) => (
                  <li key={child.slug}>
                    {entryLink(child, false)}
                    {size === 'lg' && child.summary && (
                      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                        {child.summary}
                      </p>
                    )}
                    {sections(child)}
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
