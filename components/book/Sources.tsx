import { ReactNode } from 'react'

type Props = { title?: string; children: ReactNode }

export default function Sources({ title = 'Sources', children, ...rest }: Props) {
  return (
    <section
      className="mt-16 border-t border-gray-200 pt-8 font-sans text-sm dark:border-gray-700 [&_li]:my-1 [&_ol]:pl-5 [&_ul]:pl-5"
      {...rest}
    >
      <h2 className="!mt-0 text-sm font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
        {title}
      </h2>
      {children}
    </section>
  )
}
