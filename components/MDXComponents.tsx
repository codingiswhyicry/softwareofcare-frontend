import TOCInline from 'pliny/ui/TOCInline'
import Pre from 'pliny/ui/Pre'
import BlogNewsletterForm from 'pliny/ui/BlogNewsletterForm'
import type { MDXComponents } from 'mdx/types'
import Image from './Image'
import CustomLink from './Link'
import TableWrapper from './TableWrapper'
import Callout from './book/Callout'
import ChapterOverview from './book/ChapterOverview'
import ChapterSummary from './book/ChapterSummary'
import DataTable from './book/DataTable'
import Download from './book/Download'
import Epigraph from './book/Epigraph'
import Figure from './book/Figure'
import ImplementationPlan from './book/ImplementationPlan'
import PullQuote from './book/PullQuote'
import Sources from './book/Sources'

export const components: MDXComponents = {
  Image,
  TOCInline,
  a: CustomLink,
  pre: Pre,
  table: TableWrapper,
  BlogNewsletterForm,
  Callout,
  ChapterOverview,
  ChapterSummary,
  DataTable,
  Download,
  Epigraph,
  Figure,
  ImplementationPlan,
  PullQuote,
  Sources,
}
