import Image from '@/components/Image'
import type { ChapterPayload } from '@/lib/book'

/**
 * A designed page (part divider or poem) shown as artwork. The words in the artwork
 * are repeated as hidden text so screen readers and search engines get them too.
 */
export default function PoemPlate({ poem }: { poem: NonNullable<ChapterPayload['poem']> }) {
  return (
    <figure className="mx-auto max-w-lg">
      <Image
        src={poem.image}
        alt=""
        width={840}
        height={1190}
        className="w-full rounded-sm shadow-lg"
      />
      <figcaption className="sr-only">
        {poem.title && <span>{poem.title}</span>}
        {poem.author && <span> by {poem.author}</span>}
        {poem.text && <span className="whitespace-pre-line">{`\n\n${poem.text}`}</span>}
      </figcaption>
    </figure>
  )
}
