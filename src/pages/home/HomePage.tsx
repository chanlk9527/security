import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import styles from './HomePage.module.css'

import catalog from '../../../book/catalog.json'

type BookPart = '导言' | '第一部分' | '第二部分' | '第三部分' | '第四部分' | '附录'
type Chapter = { id: string; part: BookPart; number?: number; title: string; description: string; source: string; file: string; status?: string }

const manuscripts = import.meta.glob('../../../book/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
function manuscript(file: string) {
  const source = manuscripts[`../../../book/${file}`]
  if (!source) throw new Error(`找不到书稿：${file}`)
  return source
}

const chapters: Chapter[] = [
  { id: 'introduction', part: '导言', title: '引言', description: catalog.subtitle, file: '引言.md', source: manuscript('引言.md') },
  { id: 'book-outline', part: '导言', title: '全书大纲与定位', description: '四部分、25 章的学习目标、内容分工与写作进度。', file: '全书大纲与定位.md', source: manuscript('全书大纲与定位.md') },
  ...catalog.parts.flatMap((part): Chapter[] => [
    { id: part.id, part: part.key as BookPart, title: `${part.key}导读`, description: part.description, file: `${part.directory}/README.md`, source: manuscript(`${part.directory}/README.md`) },
    ...catalog.chapters.filter((chapter) => chapter.part === part.key).map((chapter) => ({
      ...chapter, part: chapter.part as BookPart, source: manuscript(chapter.file),
    })),
  ]),
  { id: 'appendices', part: '附录', title: '概念辨析、自检与判断清单', description: '复习主要机制，查阅已有自检答案与安全判断清单。', file: '附录.md', source: manuscript('附录.md') },
]

const partOrder: BookPart[] = ['导言', ...catalog.parts.map((part) => part.key as BookPart), '附录']
const partTitle = (part: BookPart) => catalog.parts.find((item) => item.key === part)?.title ?? part
const statusLabel = (chapter: Chapter) => chapter.status === 'rewrite' ? '正文待重写' : chapter.status === 'outline' ? '章节概要' : chapter.status === 'draft' ? '正文草稿' : '导读与索引'

function titleFromMarkdown(source: string) { return source.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? '未命名章节' }

const internalRoutes: Record<string, string> = Object.fromEntries(chapters.map((chapter) => [chapter.file, `/chapter/${chapter.id}`]))
internalRoutes['安全基础手册.md'] = '/contents'

function normalizeBookUrl(url: string, currentFile: string) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url)) return url
  const target = new URL(url, `https://book.local/${currentFile}`)
  const route = internalRoutes[decodeURIComponent(target.pathname.slice(1))]
  return route ? `${route}${target.hash}` : url
}

function inlineMarkdown(value: string, currentFile: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt: string, url: string) => `<img src="${url.replace(/^\.\.\//, '/')}" alt="${alt}" />`)
    .replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text: string, url: string) => `<a href="${normalizeBookUrl(url, currentFile)}">${text}</a>`)
}

function Markdown({ source, file }: { source: string; file: string }) {
  const blocks = useMemo(() => {
    const lines = source.replace(/\r/g, '').split('\n')
    const output: Array<{ type: string; value: string; level?: number; ordinal?: number }> = []
    let paragraph: string[] = []; let code: string[] = []; let fence = ''; let table: string[] = []
    const flush = () => { if (paragraph.length) { output.push({ type: 'p', value: paragraph.join(' ') }); paragraph = [] } }
    const flushTable = () => { if (table.length) { output.push({ type: 'table', value: table.join('\n') }); table = [] } }
    for (const line of lines) {
      const marker = line.trim().match(/^(`{3,}|~{3,})/)
      if (marker && (!fence || marker[1] === fence)) { if (fence) { output.push({ type: 'code', value: code.join('\n') }); code = []; fence = '' } else { flush(); flushTable(); fence = marker[1] } continue }
      if (fence) { code.push(line); continue }
      if (line.trim().startsWith('|')) { flush(); table.push(line.trim()); continue }
      flushTable()
      const heading = line.match(/^(#{1,3})\s+(.+)$/)
      if (heading) { flush(); output.push({ type: 'h', value: heading[2], level: heading[1].length }); continue }
      if (/^\s*[-*]\s+/.test(line)) { flush(); output.push({ type: 'li', value: line.replace(/^\s*[-*]\s+/, '') }); continue }
      if (/^\s*\d+\.\s+/.test(line)) { flush(); output.push({ type: 'oli', ordinal: Number(line.trim().match(/^\d+/)?.[0] ?? 1), value: line.replace(/^\s*\d+\.\s+/, '') }); continue }
      if (/^\s*>/.test(line)) { flush(); output.push({ type: 'quote', value: line.replace(/^\s*>\s?/, '') }); continue }
      if (/^\s*---+\s*$/.test(line)) { flush(); output.push({ type: 'hr', value: '' }); continue }
      if (line.trim()) paragraph.push(line.trim()); else flush()
    }
    flush(); flushTable(); return output
  }, [source])
  return <div className={styles.markdown}>{blocks.map((block, index) => { const html = { __html: inlineMarkdown(block.value, file) }
    if (block.type === 'h') return block.level === 1 ? null : block.level === 2 ? <h2 id={block.value} key={index} dangerouslySetInnerHTML={html} /> : <h3 id={block.value} key={index} dangerouslySetInnerHTML={html} />
    if (block.type === 'table') {
      const rows = block.value.split('\n').filter((row) => !/^\|\s*:?-+/.test(row)).map((row) => row.slice(1, row.endsWith('|') ? -1 : undefined).split('|').map((cell) => cell.trim()))
      return <div className={styles.tableScroll} key={index}><table><thead><tr>{rows[0]?.map((cell, i) => <th key={i} dangerouslySetInnerHTML={{ __html: inlineMarkdown(cell, file) }} />)}</tr></thead><tbody>{rows.slice(1).map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} dangerouslySetInnerHTML={{ __html: inlineMarkdown(cell, file) }} />)}</tr>)}</tbody></table></div>
    }
    if (block.type === 'code') return <pre key={index}><code>{block.value}</code></pre>
    if (block.type === 'li') return <ul key={index}><li dangerouslySetInnerHTML={html} /></ul>
    if (block.type === 'oli') return <ol key={index} start={block.ordinal}><li dangerouslySetInnerHTML={html} /></ol>
    if (block.type === 'quote') return <blockquote key={index} dangerouslySetInnerHTML={html} />
    if (block.type === 'hr') return <hr key={index} />
    return <p key={index} dangerouslySetInnerHTML={html} />
  })}</div>
}

function BookHeader({ dark, onToggle, onSearch }: { dark: boolean; onToggle: () => void; onSearch: () => void }) {
  return <header className={styles.header}><div className={styles.headerInner}><Link className={styles.brand} to="/"><span>安全基础</span><b>在线书稿</b></Link><button className={styles.searchButton} onClick={onSearch} aria-label="搜索全书">⌕ <span>搜索</span><kbd>Ctrl K</kbd></button><nav><Link to="/chapter/introduction">开始阅读</Link><Link to="/contents">全书目录</Link></nav><button className={styles.themeButton} onClick={onToggle} aria-label={dark ? '切换为浅色主题' : '切换为深色主题'}>{dark ? '☼' : '◐'}</button></div></header>
}

function HomeView() {
  return <main className={styles.home}><section className={styles.hero}><div className={styles.heroCopy}><span className={styles.eyebrow}>SECURITY BY DESIGN | 在线书稿</span><h1>软件安全的<br /><em>隐藏边界</em></h1><p className={styles.subtitle}>面向开发者的专业、系统、全面的软件安全基础读物。以密码学与身份机制为重要支柱，贯通安全设计、应用开发、交付与运行。</p><div className={styles.actions}><Link className={styles.primaryAction} to="/chapter/introduction">开始阅读 <span>→</span></Link><Link className={styles.textAction} to="/contents">浏览全书目录 ↗</Link></div><small className={styles.note}>四部分 · 25 章 · 正文草稿与章节概要持续更新</small></div><div className={styles.heroMark}><div className={styles.shield}>✦</div><span>THREAT<br />MODEL</span><i /></div></section><section className={styles.readingPath}><span className={styles.sectionKicker}>READING PATH</span><h2>让安全要求贯穿系统始终</h2><p>从安全目标与威胁分析开始，深入密码学原理与工程实践，再进入身份、应用、交付与运行中的具体判断。</p><div className={styles.partGrid}>{catalog.parts.map((bookPart, index) => { const part = bookPart.key as BookPart; const items = chapters.filter((chapter) => chapter.part === part); return <Link className={styles.partCard} to={`/chapter/${items[0]?.id ?? 'introduction'}`} key={part}><span>0{index + 1}</span><div><strong>{part} · {bookPart.title}</strong><small>{bookPart.description}</small><b>{items.filter((item) => item.number).length} 章 →</b></div></Link> })}</div></section><section className={styles.homeFooter}><p>先把问题说清楚，再决定用什么技术解决。</p><Link to="/contents">查看完整目录 →</Link></section></main>
}

function ContentsView({ query }: { query: string }) {
  const filtered = chapters.filter((chapter) => `${chapter.title}${chapter.description}${chapter.part}`.toLowerCase().includes(query.toLowerCase()))
  return <main className={styles.contents}><div className={styles.pageIntro}><span className={styles.eyebrow}>TABLE OF CONTENTS</span><h1>全书目录</h1><p>四部分、25 章，以密码学与身份机制为重要支柱。正文草稿仍在完善，章节概要展示后续写作范围。</p></div><div className={styles.contentsList}>{partOrder.map((part) => { const items = filtered.filter((chapter) => chapter.part === part); if (!items.length) return null; return <section key={part}><div className={styles.partHeading}><span>{(part === '导言' || part === '附录') ? '—' : `0${partOrder.indexOf(part)}`}</span><h2>{part}{partTitle(part) !== part ? ` · ${partTitle(part)}` : ''}</h2><i /></div>{items.map((chapter) => <Link className={styles.chapterRow} to={`/chapter/${chapter.id}`} key={chapter.id}><span>{chapter.number ? String(chapter.number).padStart(2, '0') : '—'}</span><div><strong>{chapter.title}</strong><small>{chapter.description}</small></div><b>{chapter.number ? statusLabel(chapter) : '阅读'} →</b></Link>)}</section> })}</div></main>
}

function ReaderView({ chapterId }: { chapterId?: string }) {
  const navigate = useNavigate(); const index = Math.max(0, chapters.findIndex((chapter) => chapter.id === chapterId)); const chapter = chapters[index]
  if (!chapter) return <ContentsView query="" />
  const previous = chapters[index - 1]; const next = chapters[index + 1]
  return <main className={styles.reader}><aside className={styles.readerAside}><Link to="/contents" className={styles.backLink}>← 全书目录</Link><span className={styles.asideKicker}>当前阅读</span><strong>{chapter.title}</strong><div className={styles.asideList}>{chapters.filter((item) => item.part === chapter.part).map((item) => <Link className={item.id === chapter.id ? styles.asideActive : ''} key={item.id} to={`/chapter/${item.id}`}>{item.title}</Link>)}</div></aside><article className={styles.article}><div className={styles.articleMeta}><span>{chapter.part}</span><span>·</span><span>{chapter.number ? `第 ${chapter.number} 章 / 共 ${catalog.chapters.length} 章 · ${statusLabel(chapter)}` : statusLabel(chapter)}</span></div><h1>{titleFromMarkdown(chapter.source)}</h1><p className={styles.articleLead}>{chapter.description}</p><Markdown source={chapter.source} file={chapter.file} /><div className={styles.articleNav}><button disabled={!previous} onClick={() => previous && navigate(`/chapter/${previous.id}`)}>← {previous?.title ?? '已经是开篇'}</button><button disabled={!next} onClick={() => next && navigate(`/chapter/${next.id}`)}>{next?.title ?? '已到目录末尾'} →</button></div></article><aside className={styles.tocAside}><span>本章阅读</span><div>{chapter.source.split('\n').filter((line) => line.startsWith('## ')).slice(0, 8).map((line) => <a href={`#${line.slice(3)}`} key={line}>{line.slice(3)}</a>)}</div></aside></main>
}

export function HomePage() {
  const location = useLocation(); const { chapterId } = useParams(); const [dark, setDark] = useState(false); const [query, setQuery] = useState(''); const [searchOpen, setSearchOpen] = useState(false)
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light' }, [dark])
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true) } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey) }, [])
  const isContents = location.pathname === '/contents'
  return <div className={styles.site}><BookHeader dark={dark} onToggle={() => setDark((value) => !value)} onSearch={() => setSearchOpen(true)} />{searchOpen && <div className={styles.searchPanel}><div><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索章节、主题或关键词" /><button onClick={() => setSearchOpen(false)}>关闭</button></div><ContentsView query={query} /></div>}{!searchOpen && (isContents ? <ContentsView query="" /> : chapterId ? <ReaderView chapterId={chapterId} /> : <HomeView />)}</div>
}
