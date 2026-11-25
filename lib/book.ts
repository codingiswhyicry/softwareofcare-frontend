import { allBooks } from 'contentlayer/generated'
import type { Book } from 'contentlayer/generated'

const isProduction = process.env.NODE_ENV === 'production'

/** Lightweight description of a book entry, safe to pass to client components. */
export type BookEntry = {
  slug: string
  path: string
  kind: 'part' | 'chapter'
  title: string
  label?: string
  summary?: string
  partSlug: string
  words: number
  minutes: number
  sections: { title: string; url: string }[]
}

export type ContentsNode = BookEntry & { children: BookEntry[] }

/** Every published entry (parts and chapters) in reading order. */
export function getBookDocs(): Book[] {
  return allBooks
    .filter((doc) => !(isProduction && doc.draft))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
}

export function getBookDoc(slug: string): Book | undefined {
  return getBookDocs().find((doc) => doc.slug === slug)
}

export function toEntry(doc: Book): BookEntry {
  return {
    slug: doc.slug,
    path: `/${doc.path}/`,
    kind: doc.kind as BookEntry['kind'],
    title: doc.title,
    label: doc.label,
    summary: doc.summary,
    partSlug: doc.partSlug,
    words: doc.wordCount,
    minutes: Math.max(1, Math.round(doc.readingTime?.minutes ?? 1)),
    sections: (doc.toc ?? [])
      .filter((heading) => heading.depth === 2)
      .map((heading) => ({ title: heading.value, url: heading.url })),
  }
}

/** The whole book as a flat reading sequence. */
export function getSequence(): BookEntry[] {
  return getBookDocs().map(toEntry)
}

/** The book as a tree: top-level chapters and parts, with parts holding their chapters. */
export function getContents(): ContentsNode[] {
  const nodes: ContentsNode[] = []
  for (const entry of getSequence()) {
    if (entry.kind === 'part') {
      nodes.push({ ...entry, children: [] })
    } else if (entry.partSlug) {
      const part = nodes.find((node) => node.kind === 'part' && node.slug === entry.partSlug)
      if (part) part.children.push(entry)
      else nodes.push({ ...entry, children: [] })
    } else {
      nodes.push({ ...entry, children: [] })
    }
  }
  return nodes
}

/** What the reader needs to render one entry client-side. */
export type ChapterPayload = BookEntry & {
  code: string
  epigraph?: string
  epigraphAttribution?: string
  image?: string
  poem?: { image: string; title?: string; author?: string; text?: string }
  partTitle?: string
  partLabel?: string
  children: BookEntry[]
}

export function getChapterPayload(slug: string): ChapterPayload | undefined {
  const doc = getBookDoc(slug)
  if (!doc) return undefined
  const part = doc.kind === 'chapter' && doc.partSlug ? getBookDoc(doc.partSlug) : undefined
  return {
    ...toEntry(doc),
    code: doc.body.code,
    epigraph: doc.epigraph,
    epigraphAttribution: doc.epigraphAttribution,
    image: doc.image,
    poem: doc.poem
      ? { image: doc.poem, title: doc.poemTitle, author: doc.poemAuthor, text: doc.poemText }
      : undefined,
    partTitle: part?.title,
    partLabel: part?.label,
    children:
      doc.kind === 'part'
        ? getSequence().filter((e) => e.kind === 'chapter' && e.partSlug === doc.slug)
        : [],
  }
}
