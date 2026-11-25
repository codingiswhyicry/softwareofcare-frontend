/**
 * Saves each reader's position in localStorage, so it is per browser and needs no account.
 * The shape is kept server-friendly so it can later sync to a backend for cross-device reading.
 */

export type ChapterPosition = {
  /** `data-rid` of the block at the top of the viewport. */
  rid: string
  /** Pixels scrolled past the top of that block. */
  offset: number
  /** Start of the block's text, used to find it again if ids shift after edits. */
  snippet: string
  /** 0–1 through this chapter. */
  progress: number
  /** Furthest 0–1 ever reached in this chapter. */
  maxProgress: number
  updatedAt: number
}

export type LastPosition = ChapterPosition & {
  slug: string
  path: string
  title: string
  label?: string
  /** 0–1 through the whole book. */
  bookProgress: number
}

const LAST_KEY = 'soc:reading:last'
const CHAPTERS_KEY = 'soc:reading:chapters'

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked (private mode): resuming just won't be available.
  }
}

export function getLastPosition(): LastPosition | null {
  return read<LastPosition>(LAST_KEY)
}

export function getChapterPositions(): Record<string, ChapterPosition> {
  return read<Record<string, ChapterPosition>>(CHAPTERS_KEY) ?? {}
}

export function savePosition(position: LastPosition) {
  const chapters = getChapterPositions()
  const previous = chapters[position.slug]
  const { slug, rid, offset, snippet, progress, updatedAt } = position
  chapters[slug] = {
    rid,
    offset,
    snippet,
    progress,
    maxProgress: Math.max(progress, previous?.maxProgress ?? 0),
    updatedAt,
  }
  write(CHAPTERS_KEY, chapters)
  write(LAST_KEY, position)
}

export function clearChapterPosition(slug: string) {
  const chapters = getChapterPositions()
  if (chapters[slug]) {
    chapters[slug] = { ...chapters[slug], rid: '0', offset: 0, progress: 0 }
    write(CHAPTERS_KEY, chapters)
  }
}

export function snippetOf(el: Element) {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80)
}

/** Find the saved block inside a chapter, falling back to its text if block ids have shifted. */
export function findSavedBlock(chapterEl: Element, position: ChapterPosition): HTMLElement | null {
  const byId = chapterEl.querySelector<HTMLElement>(`[data-rid="${position.rid}"]`)
  if (byId && (!position.snippet || snippetOf(byId) === position.snippet)) return byId
  if (position.snippet) {
    const blocks = chapterEl.querySelectorAll<HTMLElement>('[data-rid]')
    for (const block of blocks) {
      if (snippetOf(block) === position.snippet) return block
    }
  }
  return byId
}
