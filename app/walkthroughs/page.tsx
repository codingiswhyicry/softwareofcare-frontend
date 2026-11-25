import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({ title: 'Walkthroughs' })

export default function Walkthroughs() {
  return (
    <div className="py-12">
      <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-gray-100">
        Walkthroughs
      </h1>
      <p className="mt-4 text-gray-500 dark:text-gray-400">Coming soon.</p>
    </div>
  )
}
