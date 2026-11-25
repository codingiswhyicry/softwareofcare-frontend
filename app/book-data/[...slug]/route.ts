import { getBookDocs, getChapterPayload } from '@/lib/book'

/** Static JSON for each chapter, used by the reader to append the next chapter as you scroll. */
export const dynamic = 'force-static'

export const generateStaticParams = async () =>
  getBookDocs().map((doc) => ({ slug: doc.slug.split('/') }))

export async function GET(_request: Request, props: { params: Promise<{ slug: string[] }> }) {
  const slug = (await props.params).slug.map((segment) => decodeURI(segment)).join('/')
  const chapter = getChapterPayload(slug)
  if (!chapter) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(chapter)
}
