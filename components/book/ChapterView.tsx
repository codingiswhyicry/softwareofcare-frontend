import { MDXLayoutRenderer } from 'pliny/mdx-components'
import { components } from '@/components/MDXComponents'
import Image from '@/components/Image'
import Link from '@/components/Link'
import PoemPlate from './PoemPlate'
import type { ChapterPayload } from '@/lib/book'

export default function ChapterView({ chapter }: { chapter: ChapterPayload }) {
  const isPart = chapter.kind === 'part'

  return (
    <article
      data-chapter={chapter.slug}
      data-path={chapter.path}
      data-title={chapter.title}
      className={isPart ? 'py-24 sm:py-32' : 'pt-16 pb-24'}
    >
      {isPart && chapter.image && (
        <header>
          <p className="sr-only">{chapter.label}</p>
          <h1 className="sr-only">{chapter.title}</h1>
          <Image
            src={chapter.image}
            alt=""
            width={840}
            height={1190}
            priority
            className="mx-auto w-full max-w-lg rounded-sm shadow-lg"
          />
        </header>
      )}
      {chapter.poem && (
        <div className={isPart ? 'mt-[30vh]' : 'mb-[30vh]'}>
          <PoemPlate poem={chapter.poem} />
        </div>
      )}
      <header
        hidden={isPart && !!chapter.image}
        className={
          isPart ? 'text-center' : 'mb-12 border-b border-gray-200 pb-10 dark:border-gray-700'
        }
      >
        {chapter.partTitle && !isPart && (
          <p className="font-sans text-sm text-gray-500 dark:text-gray-400">
            {chapter.partLabel ? `${chapter.partLabel} · ` : ''}
            {chapter.partTitle}
          </p>
        )}
        {chapter.label && (
          <p className="text-goth-blueberry dark:text-primary-400 mt-2 font-sans text-sm font-semibold tracking-widest uppercase">
            {chapter.label}
          </p>
        )}
        <h1
          className={`mt-3 font-light tracking-tight text-gray-900 dark:text-gray-100 ${
            isPart ? 'text-5xl sm:text-6xl' : 'text-4xl sm:text-5xl'
          }`}
        >
          {chapter.title}
        </h1>
        {chapter.summary && (
          <p
            className={`mt-5 text-lg text-gray-600 italic dark:text-gray-400 ${isPart ? 'mx-auto max-w-xl' : ''}`}
          >
            {chapter.summary}
          </p>
        )}
        {chapter.epigraph && (
          <div className="mt-8 ml-auto max-w-md text-right">
            <p className="text-gray-700 italic dark:text-gray-300">{chapter.epigraph}</p>
            {chapter.epigraphAttribution && (
              <p className="mt-1 font-sans text-sm text-gray-500">
                — {chapter.epigraphAttribution}
              </p>
            )}
          </div>
        )}
        {!isPart && (
          <p className="mt-6 font-sans text-xs tracking-wide text-gray-500 uppercase dark:text-gray-400">
            {chapter.minutes} min read
          </p>
        )}
      </header>

      <div className="prose dark:prose-invert max-w-none">
        <MDXLayoutRenderer code={chapter.code} components={components} />
      </div>

      {isPart && chapter.children.length > 0 && (
        <ol className="mx-auto mt-[20vh] max-w-md space-y-3 font-sans">
          {chapter.children.map((child) => (
            <li key={child.slug} className="flex items-baseline justify-between gap-4">
              <Link
                href={child.path}
                className="hover:text-primary-500 text-gray-800 dark:text-gray-200"
              >
                {child.label && <span className="text-gray-500">{child.label}: </span>}
                {child.title}
              </Link>
              <span className="shrink-0 text-xs text-gray-400">{child.minutes} min</span>
            </li>
          ))}
        </ol>
      )}
    </article>
  )
}
