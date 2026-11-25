# Software of Care: website implementation plan

The website publishes the book so readers can scroll through it continuously, like a printed book,
while every chapter still has its own URL that can be shared and indexed, like a blog post.

## Goals

1. **Every chapter is its own page** (`/book/part-slug/chapter-slug/`), so it can be linked, shared, and indexed by search engines.
2. **Parts are parents.** Chapters live inside parts, and each part has a title page that opens it.
3. **Reads like a book, not a blog.** At the end of a chapter, the next one loads underneath it automatically. The URL, page title, progress bar, and contents sidebar update as you scroll, so no clicking through is needed.
4. **Remembers where you are.** The site saves the exact paragraph each reader was on. "Continue reading" (and simply reopening a chapter) brings them back to that paragraph.
5. **Book-specific components:** chapter headers, sources and notes, chapter summaries, callouts, figures and graphics, images, tables, epigraphs, pull quotes, and downloads.
6. **Additional materials** (worksheets, templates, and so on) live in their own section and can be downloaded.

## Content model

The folder structure *is* the book structure. Numeric prefixes set the order and are removed from URLs.

```
data/book/
  00-introduction.mdx               → /book/introduction/
  01-part-one/
    index.mdx                       → /book/part-one/                (part title page)
    01-software-of-care.mdx         → /book/part-one/software-of-care/
    02-providing-care.mdx           → /book/part-one/providing-care/
  02-part-two/
    index.mdx
    03-encoding-social-good.mdx
  90-afterword.mdx                  → /book/afterword/
data/resources/                     → /resources/  (additional materials, Phase 6)
```

To move a chapter into a different part, move its file. Chapter frontmatter looks like this:

```yaml
---
title: software of care
label: Chapter 1            # shown above the title ("Part One", "Afterword", …)
summary: One or two sentences, used on the contents page and for SEO.
epigraph: Optional opening quote.
epigraphAttribution: Who said it
draft: false
---
```

## Reading experience

- `/book/` is the contents page: parts, then chapters, with per-chapter progress ticks and a "Continue reading" button.
- `/book/[...slug]/` is the reader. It server-renders the requested chapter (for SEO and fast first paint), then appends each following chapter as the reader nears the end. Chapter data comes from a static JSON route (`/book-data/[...slug]/`).
- **Scroll tracking:** at build time, a rehype plugin stamps every top-level block (paragraph, heading, figure, …) with `data-rid`. As the reader scrolls, the site finds the block at the top of the viewport. From that it updates the URL (`history.replaceState`), the document title, the progress bar, and the active contents entry.
- **Resume:** the site saves `{ chapter, block id, pixel offset into block, text snippet }` to `localStorage`. It saves every second while scrolling, and again when the tab closes. Reopening the chapter, or pressing "Continue reading", scrolls back to that block. A toast offers "start from the beginning". If edits to the manuscript shift block numbers, the saved text snippet is used to find the paragraph again.
- **Not in v1:** cross-device sync. That needs reader accounts (for example Supabase or Clerk), which can come later. The same position format can be sent to a server.

## Components (MDX)

| Component | Usage |
| --- | --- |
| Chapter header | Automatic, built from frontmatter (label, title, epigraph, reading time) |
| `<Callout type="note \| key \| warning \| example \| reflect" title="">` | Callout boxes |
| `<ChapterOverview>` | "This chapter covers" box at the start of a chapter |
| `<ChapterSummary>` | Summary box, usually at the end of a chapter |
| `<ImplementationPlan>` | Practical next steps, after the summary |
| `<Figure src width height alt caption source credit size="text \| wide">` | Graphics and charts with caption and source |
| `![alt](/static/images/x.png)` | Plain image embed |
| Markdown table, optionally wrapped in `<DataTable caption source>` | Tables |
| `[^1]` footnotes | Inline citations, collected under **Notes** at the end of the chapter |
| `<Sources>` | A manual list of sources for a chapter |
| `<Epigraph attribution="">`, `<PullQuote>` | Literary extras |
| `<Download href title description>` | Links to additional materials |

## Phases

1. **Foundation**: the `Book` content type, folder-based ordering, the contents page, the chapter route, and nav updates. *(started)*
2. **Components**: everything in the table above, with serif reading typography. *(started)*
3. **Continuous reading**: next chapters load automatically, the URL and title follow the scroll, a reading progress bar, and a contents sidebar or drawer. *(started)*
4. **Resume reading**: saved position, auto-resume, a "Continue reading" button, and per-chapter progress ticks. *(started)*
5. **Manuscript import**: *(done)* `python3 -I scripts/import-manuscript.py <manuscript.docx> data/book` regenerates every chapter from the Word export of the Pages file. It maps headings, `[Example]` boxes, "looks like:" boxes, figures (placeholder image for now), tables, quotes, footnotes, summaries, and implementation plans. **Re-running it overwrites `data/book/`.** Either keep editing in Pages and re-import, or switch to editing the MDX directly, but don't mix the two.
6. **Additional materials**: the `Resource` content type, a `/resources/` page, and downloadable files.
7. **Polish and launch**: landing page design, adding chapters to search, OG images per chapter, RSS of chapters, removing leftover template pages, and deployment (Vercel).

## Open questions

- Parts are set: I *imagining care* (ch. 1–4), II *building the software* (5–9), III *bringing it to the world.* (10–17). Each part's `index.mdx` has its divider artwork (`image`) and poem (`poem`, `poemTitle`, `poemAuthor`, `poemText`). Any chapter can open with a poem the same way, as ch. 16 does with Baldwin. The import script's `PARTS` table says which chapters go in which folder, and re-importing keeps existing frontmatter.
- Figures currently use `public/static/images/book/placeholder.png`. Swap in the real files as they're made.
