'use client'

import { MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import siteMetadata from '@/data/siteMetadata'
import type { BookEntry, ChapterPayload, ContentsNode } from '@/lib/book'
import {
  clearChapterPosition,
  findSavedBlock,
  getChapterPositions,
  savePosition,
  snippetOf,
} from '@/lib/reading-position'
import BookContents from './BookContents'
import ChapterView from './ChapterView'

/** Distance from the top of the viewport that counts as "where the reader is". */
const READ_LINE = 120
const SAVE_INTERVAL = 1000
const basePath = process.env.BASE_PATH || ''

type Props = {
  initial: ChapterPayload
  sequence: BookEntry[]
  contents: ContentsNode[]
}

const clamp = (n: number) => Math.min(1, Math.max(0, n))

export default function BookReader({ initial, sequence, contents }: Props) {
  const [chapters, setChapters] = useState<ChapterPayload[]>([initial])
  const [activeSlug, setActiveSlug] = useState(initial.slug)
  const [bookProgress, setBookProgress] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [resumed, setResumed] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)
  const restoredRef = useRef(false)
  const lastSaveRef = useRef(0)
  const activeRef = useRef(initial.slug)

  const indexOf = useCallback(
    (slug: string) => sequence.findIndex((e) => e.slug === slug),
    [sequence]
  )

  const { wordsBefore, totalWords } = useMemo(() => {
    const before: Record<string, number> = {}
    let total = 0
    for (const entry of sequence) {
      before[entry.slug] = total
      total += entry.words
    }
    return { wordsBefore: before, totalWords: Math.max(1, total) }
  }, [sequence])

  const lastLoaded = chapters[chapters.length - 1]
  const nextEntry = sequence[indexOf(lastLoaded.slug) + 1]
  const prevEntry = sequence[indexOf(initial.slug) - 1]

  // Load the following chapter when the reader gets close to the end of the last one.
  const loadNext = useCallback(async () => {
    if (loadingRef.current || !nextEntry) return
    loadingRef.current = true
    try {
      const res = await fetch(`${basePath}/book-data/${nextEntry.slug}/`)
      if (!res.ok) throw new Error(`Failed to load ${nextEntry.slug}`)
      const payload = (await res.json()) as ChapterPayload
      setChapters((loaded) =>
        loaded.some((c) => c.slug === payload.slug) ? loaded : [...loaded, payload]
      )
    } catch (error) {
      console.error(error)
    } finally {
      loadingRef.current = false
    }
  }, [nextEntry])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !nextEntry) return
    const observer = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && loadNext(),
      { rootMargin: '0px 0px 1500px 0px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadNext, nextEntry])

  // Work out which chapter and block are at the reading line.
  const measure = useCallback(() => {
    const root = rootRef.current
    if (!root) return null
    const articles = Array.from(root.querySelectorAll<HTMLElement>('article[data-chapter]'))
    if (!articles.length) return null
    let article = articles[0]
    for (const candidate of articles) {
      if (candidate.getBoundingClientRect().top <= READ_LINE) article = candidate
    }
    const rect = article.getBoundingClientRect()
    const scrollable = rect.height - (window.innerHeight - READ_LINE)
    const progress = scrollable > 0 ? clamp((READ_LINE - rect.top) / scrollable) : 1

    const blocks = article.querySelectorAll<HTMLElement>('[data-rid]')
    let block: HTMLElement | null = null
    for (const candidate of blocks) {
      if (candidate.getBoundingClientRect().bottom > READ_LINE) {
        block = candidate
        break
      }
    }
    return { article, block, progress }
  }, [])

  const save = useCallback(() => {
    const m = measure()
    if (!m || !m.block) return
    const slug = m.article.dataset.chapter!
    const entry = sequence[indexOf(slug)]
    if (!entry || entry.kind !== 'chapter') return
    savePosition({
      slug,
      path: entry.path,
      title: entry.title,
      label: entry.label,
      rid: m.block.dataset.rid!,
      offset: Math.round(READ_LINE - m.block.getBoundingClientRect().top),
      snippet: snippetOf(m.block),
      progress: m.progress,
      maxProgress: m.progress,
      bookProgress: (wordsBefore[slug] + m.progress * entry.words) / totalWords,
      updatedAt: Date.now(),
    })
  }, [measure, sequence, indexOf, wordsBefore, totalWords])

  // Fade each chapter in as it arrives and out as it leaves, so chapters read as separate pieces.
  const fadeChapters = useCallback(() => {
    const root = rootRef.current
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const vh = window.innerHeight
    for (const el of root.querySelectorAll<HTMLElement>('[data-fade]')) {
      const rect = el.getBoundingClientRect()
      const fadeIn = clamp((vh - rect.top) / (vh * 0.45))
      const fadeOut = clamp(rect.bottom / (vh * 0.4))
      el.style.opacity = String(Math.min(fadeIn, fadeOut))
    }
  }, [])

  useEffect(fadeChapters, [chapters, fadeChapters])

  // Track scrolling: update URL, title, and progress, and save the position.
  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        fadeChapters()
        const m = measure()
        if (!m) return
        const slug = m.article.dataset.chapter!
        const entry = sequence[indexOf(slug)]
        if (!entry) return
        setBookProgress((wordsBefore[slug] + m.progress * entry.words) / totalWords)

        if (slug !== activeRef.current) {
          activeRef.current = slug
          setActiveSlug(slug)
          window.history.replaceState(window.history.state, '', `${basePath}${entry.path}`)
          document.title = `${entry.title} | ${siteMetadata.title}`
        }

        const now = Date.now()
        if (restoredRef.current && now - lastSaveRef.current > SAVE_INTERVAL) {
          lastSaveRef.current = now
          save()
        }
      })
    }
    const onLeave = () => restoredRef.current && save()
    const onVisibility = () => document.visibilityState === 'hidden' && onLeave()

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pagehide', onLeave)
    document.addEventListener('visibilitychange', onVisibility)
    onScroll()
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pagehide', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [measure, save, fadeChapters, sequence, indexOf, wordsBefore, totalWords])

  // On arrival, return the reader to where they left off in this chapter.
  useEffect(() => {
    const finish = () => {
      restoredRef.current = true
    }
    const position = getChapterPositions()[initial.slug]
    if (window.location.hash || !position || position.progress < 0.02 || position.progress > 0.98) {
      finish()
      return
    }
    const restore = () => {
      const article = rootRef.current?.querySelector(`[data-chapter="${initial.slug}"]`)
      const block = article && findSavedBlock(article, position)
      if (!block) return
      const top = block.getBoundingClientRect().top + window.scrollY - READ_LINE + position.offset
      window.scrollTo({ top, behavior: 'instant' as ScrollBehavior })
    }
    requestAnimationFrame(() => {
      restore()
      setResumed(true)
      // Fonts and images can shift layout after first paint; settle once more.
      const settle = document.fonts?.ready ?? Promise.resolve()
      settle.then(() => {
        restore()
        setTimeout(finish, 300)
      })
    })
  }, [initial.slug])

  useEffect(() => {
    if (!resumed) return
    const timer = setTimeout(() => setResumed(false), 8000)
    return () => clearTimeout(timer)
  }, [resumed])

  const scrollToChapter = (slug: string, hash?: string) => {
    const article = rootRef.current?.querySelector<HTMLElement>(`[data-chapter="${slug}"]`)
    if (!article) return false
    const target = hash ? article.querySelector<HTMLElement>(`[id="${hash.slice(1)}"]`) : article
    if (!target) return false
    const top = target.getBoundingClientRect().top + window.scrollY - READ_LINE + 16
    window.scrollTo({ top, behavior: 'smooth' })
    return true
  }

  const onNavigate = (event: MouseEvent<HTMLAnchorElement>, entry: BookEntry, hash?: string) => {
    if (scrollToChapter(entry.slug, hash)) event.preventDefault()
    setDrawerOpen(false)
  }

  const startOver = () => {
    clearChapterPosition(initial.slug)
    setResumed(false)
    scrollToChapter(initial.slug)
  }

  const active = sequence[indexOf(activeSlug)]

  return (
    <div ref={rootRef} className="relative">
      {/* Reading bar */}
      <div className="sticky top-0 z-40 -mx-4 border-b border-gray-200 bg-white/60 px-4 backdrop-blur-md sm:-mx-6 sm:px-6 xl:mx-0 xl:px-0 dark:border-gray-800 dark:bg-black/30">
        <div className="flex h-12 items-center gap-3 font-sans text-sm">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="hover:text-primary-500 rounded-md border border-gray-200 px-2.5 py-1 text-gray-700 xl:hidden dark:border-gray-700 dark:text-gray-300"
          >
            Contents
          </button>
          <p className="min-w-0 flex-1 truncate text-gray-600 dark:text-gray-400">
            {active?.label && <span className="text-gray-400">{active.label} · </span>}
            {active?.title}
          </p>
          <span className="text-xs text-gray-400 tabular-nums">
            {Math.round(bookProgress * 100)}%
          </span>
        </div>
        <div
          className="bg-primary-500 absolute bottom-0 left-0 h-0.5 transition-[width] duration-150"
          style={{ width: `${bookProgress * 100}%` }}
          role="progressbar"
          aria-label="Progress through the book"
          aria-valuenow={Math.round(bookProgress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      <div className="xl:grid xl:grid-cols-[15rem_1fr] xl:gap-12">
        {/* Sidebar contents (large screens) */}
        <aside className="hidden xl:block">
          <div className="no-scrollbar sticky top-16 max-h-[calc(100vh-5rem)] overflow-y-auto py-10">
            <Link
              href="/book/"
              className="font-sans text-xs font-semibold tracking-widest text-gray-500 uppercase"
            >
              {siteMetadata.title}
            </Link>
            <div className="mt-4">
              <BookContents
                contents={contents}
                activeSlug={activeSlug}
                showSections
                onNavigate={onNavigate}
              />
            </div>
          </div>
        </aside>

        <div className="mx-auto w-full max-w-2xl">
          {prevEntry && (
            <p className="pt-8 font-sans text-sm">
              <Link href={prevEntry.path} className="hover:text-primary-500 text-gray-500">
                ← {prevEntry.label ? `${prevEntry.label}: ` : ''}
                {prevEntry.title}
              </Link>
            </p>
          )}

          {chapters.map((chapter, i) => (
            <div key={chapter.slug}>
              {i > 0 && (
                <div aria-hidden className="flex h-[60vh] items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${basePath}/static/images/4pointstar.svg`}
                    alt=""
                    className="h-6 w-6 opacity-40 dark:invert"
                  />
                </div>
              )}
              <div data-fade className="will-change-[opacity]">
                <ChapterView chapter={chapter} />
              </div>
            </div>
          ))}

          <div ref={sentinelRef} aria-hidden />
          {nextEntry ? (
            <div className="py-16 text-center font-sans text-sm text-gray-400">
              <button type="button" onClick={loadNext} className="hover:text-primary-500">
                Continue to {nextEntry.label ? `${nextEntry.label}: ` : ''}
                {nextEntry.title} ↓
              </button>
            </div>
          ) : (
            <div className="py-24 text-center font-sans">
              <p className="text-gray-500">The end.</p>
              <Link
                href="/book/"
                className="text-goth-blueberry dark:text-primary-400 mt-2 inline-block text-sm"
              >
                Back to contents
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Contents drawer (small screens) */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Contents"
        >
          <button
            type="button"
            aria-label="Close contents"
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] overflow-y-auto bg-white p-6 shadow-xl dark:bg-gray-950">
            <div className="mb-6 flex items-center justify-between font-sans">
              <span className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
                Contents
              </span>
              <button type="button" onClick={() => setDrawerOpen(false)} className="text-gray-500">
                Close
              </button>
            </div>
            <BookContents
              contents={contents}
              activeSlug={activeSlug}
              showSections
              onNavigate={onNavigate}
            />
          </div>
        </div>
      )}

      {/* Resume toast */}
      {resumed && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-4 rounded-full bg-gray-900 px-5 py-3 font-sans text-sm text-white shadow-lg dark:bg-gray-100 dark:text-gray-900">
            <span>Picked up where you left off.</span>
            <button
              type="button"
              onClick={startOver}
              className="text-primary-400 dark:text-primary-600 font-medium"
            >
              Start from the beginning
            </button>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setResumed(false)}
              className="opacity-60"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
