import Image from '@/components/Image'

type Props = {
  src: string
  alt: string
  width: number
  height: number
  caption?: string
  source?: string
  credit?: string
  /** `text` stays within the reading column; `wide` breaks out of it on large screens. */
  size?: 'text' | 'wide'
}

export default function Figure({
  src,
  alt,
  width,
  height,
  caption,
  source,
  credit,
  size = 'text',
  ...rest
}: Props) {
  return (
    <figure className={`not-prose my-10 ${size === 'wide' ? 'xl:-mx-24' : ''}`} {...rest}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="h-auto w-full rounded-md"
        sizes={
          size === 'wide' ? '(min-width: 1280px) 56rem, 100vw' : '(min-width: 768px) 42rem, 100vw'
        }
      />
      {(caption || source || credit) && (
        <figcaption className="mt-3 space-y-1 font-sans text-sm text-gray-600 dark:text-gray-400">
          {caption && <p className="italic">{caption}</p>}
          {source && <p className="text-xs">Source: {source}</p>}
          {credit && <p className="text-xs">Credit: {credit}</p>}
        </figcaption>
      )}
    </figure>
  )
}
