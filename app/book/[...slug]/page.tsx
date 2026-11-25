import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import siteMetadata from '@/data/siteMetadata'
import BookReader from '@/components/book/BookReader'
import { getBookDocs, getChapterPayload, getContents, getSequence } from '@/lib/book'

type Params = { params: Promise<{ slug: string[] }> }

const slugFrom = async (props: Params) =>
  (await props.params).slug.map((segment) => decodeURI(segment)).join('/')

export const generateStaticParams = async () =>
  getBookDocs().map((doc) => ({ slug: doc.slug.split('/') }))

export async function generateMetadata(props: Params): Promise<Metadata | undefined> {
  const chapter = getChapterPayload(await slugFrom(props))
  if (!chapter) return
  const title = chapter.label ? `${chapter.label}: ${chapter.title}` : chapter.title
  return {
    title,
    description: chapter.summary ?? siteMetadata.description,
    openGraph: {
      title,
      description: chapter.summary ?? siteMetadata.description,
      siteName: siteMetadata.title,
      type: 'article',
      url: './',
      images: [siteMetadata.socialBanner],
      authors: [siteMetadata.author],
    },
  }
}

export default async function BookPage(props: Params) {
  const chapter = getChapterPayload(await slugFrom(props))
  if (!chapter) return notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Chapter',
    name: chapter.title,
    description: chapter.summary,
    url: `${siteMetadata.siteUrl}${chapter.path}`,
    isPartOf: { '@type': 'Book', name: siteMetadata.title, author: siteMetadata.author },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BookReader
        key={chapter.slug}
        initial={chapter}
        sequence={getSequence()}
        contents={getContents()}
      />
    </>
  )
}
