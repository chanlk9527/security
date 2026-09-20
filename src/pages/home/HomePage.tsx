import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import styles from './HomePage.module.css'

import introduction from '../../../book/引言.md?raw'
import foundationsOverview from '../../../book/第一部分-安全问题怎样被描述/README.md?raw'
import protectAssets from '../../../book/第一部分-安全问题怎样被描述/01-先说清楚要保护什么.md?raw'
import cryptoOverview from '../../../book/第二部分-密码学基础/README.md?raw'
import randomness from '../../../book/第二部分-密码学基础/03-随机数、秘密、盐与Nonce.md?raw'
import hashes from '../../../book/第二部分-密码学基础/04-哈希、MAC与密码存储.md?raw'
import integrity from '../../../book/第二部分-密码学基础/05-加密还必须考虑完整性.md?raw'
import keys from '../../../book/第二部分-密码学基础/06-公私钥、数字签名与证书.md?raw'
import tls from '../../../book/第二部分-密码学基础/07-TLS与密钥生命周期.md?raw'

type BookPart = '导言' | '第一部分' | '第二部分'
type Chapter = { id: string; part: BookPart; title: string; description: string; source: string }

const chapters: Chapter[] = [
  { id: 'introduction', part: '导言', title: '引言', description: '从安全问题的隐藏边界开始，建立一套可复用的工程判断方法。', source: introduction },
  { id: 'foundations', part: '第一部分', title: '第一部分导读', description: '先说明资产、损失和信任边界，再进入具体安全机制。', source: foundationsOverview },
  { id: 'protect-assets', part: '第一部分', title: '先说清楚要保护什么', description: '从资产和损失开始，建立安全讨论的共同语言。', source: protectAssets },
  { id: 'crypto', part: '第二部分', title: '第二部分导读', description: '在不展开完整数学推导的前提下，建立密码学的工程判断。', source: cryptoOverview },
  { id: 'randomness', part: '第二部分', title: '随机数、秘密、盐与 Nonce', description: '理解猜测、重放、密码存储和加密中的不同随机值。', source: randomness },
  { id: 'hashes', part: '第二部分', title: '哈希、MAC 与密码存储', description: '同样是摘要，为什么不能互换。', source: hashes },
  { id: 'integrity', part: '第二部分', title: '加密还必须考虑完整性', description: '看不懂不等于改不了，保密与完整性必须一起设计。', source: integrity },
  { id: 'keys', part: '第二部分', title: '公私钥、数字签名与证书', description: '公钥公开以后，凭什么相信它。', source: keys },
  { id: 'tls', part: '第二部分', title: 'TLS 与密钥生命周期', description: '把协议、证书和密钥的生命周期放回完整系统。', source: tls },
]

const partOrder: BookPart[] = ['导言', '第一部分', '第二部分']

function titleFromMarkdown(source: string) { return source.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? '未命名章节' }

const internalRoutes: Record<string, string> = {}

function normalizeBookUrl(url: string) {
  const file = decodeURIComponent(url).split('/').pop() ?? ''
  return internalRoutes[file] ? `/chapter/${internalRoutes[file]}` : url
}

function inlineMarkdown(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt: string, url: string) => `<img src="${url.replace(/^\.\.\//, '/')}" alt="${alt}" />`)
    .replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text: string, url: string) => `<a href="${normalizeBookUrl(url)}">${text}</a>`)
}

function Markdown({ source }: { source: string }) {
  const blocks = useMemo(() => {
    const lines = source.replace(/\r/g, '').split('\n')
    const output: Array<{ type: string; value: string; level?: number }> = []
    let paragraph: string[] = []; let code: string[] = []; let inCode = false
    const flush = () => { if (paragraph.length) { output.push({ type: 'p', value: paragraph.join(' ') }); paragraph = [] } }
    for (const line of lines) {
      if (line.trim().startsWith('```')) { if (inCode) { output.push({ type: 'code', value: code.join('\n') }); code = [] } else flush(); inCode = !inCode; continue }
      if (inCode) { code.push(line); continue }
      const heading = line.match(/^(#{1,3})\s+(.+)$/)
      if (heading) { flush(); output.push({ type: 'h', value: heading[2], level: heading[1].length }); continue }
      if (/^\s*[-*]\s+/.test(line)) { flush(); output.push({ type: 'li', value: line.replace(/^\s*[-*]\s+/, '') }); continue }
      if (/^\s*\d+\.\s+/.test(line)) { flush(); output.push({ type: 'oli', value: line.replace(/^\s*\d+\.\s+/, '') }); continue }
      if (/^\s*>/.test(line)) { flush(); output.push({ type: 'quote', value: line.replace(/^\s*>\s?/, '') }); continue }
      if (/^\s*---+\s*$/.test(line)) { flush(); output.push({ type: 'hr', value: '' }); continue }
      if (line.trim()) paragraph.push(line.trim()); else flush()
    }
    flush(); return output
  }, [source])
  return <div className={styles.markdown}>{blocks.map((block, index) => { const html = { __html: inlineMarkdown(block.value) }
    if (block.type === 'h') return block.level === 1 ? null : block.level === 2 ? <h2 key={index} dangerouslySetInnerHTML={html} /> : <h3 key={index} dangerouslySetInnerHTML={html} />
    if (block.type === 'code') return <pre key={index}><code>{block.value}</code></pre>
    if (block.type === 'li') return <ul key={index}><li dangerouslySetInnerHTML={html} /></ul>
    if (block.type === 'oli') return <ol key={index}><li dangerouslySetInnerHTML={html} /></ol>
    if (block.type === 'quote') return <blockquote key={index} dangerouslySetInnerHTML={html} />
    if (block.type === 'hr') return <hr key={index} />
    return <p key={index} dangerouslySetInnerHTML={html} />
  })}</div>
}

function BookHeader({ dark, onToggle, onSearch }: { dark: boolean; onToggle: () => void; onSearch: () => void }) {
  return <header className={styles.header}><div className={styles.headerInner}><Link className={styles.brand} to="/"><span>安全基础</span><b>在线书稿</b></Link><button className={styles.searchButton} onClick={onSearch} aria-label="搜索全书">⌕ <span>搜索</span><kbd>Ctrl K</kbd></button><nav><Link to="/chapter/introduction">开始阅读</Link><Link to="/contents">全书目录</Link></nav><button className={styles.themeButton} onClick={onToggle} aria-label={dark ? '切换为浅色主题' : '切换为深色主题'}>{dark ? '☼' : '◐'}</button></div></header>
}

function HomeView() {
  return <main className={styles.home}><section className={styles.hero}><div className={styles.heroCopy}><span className={styles.eyebrow}>SECURITY BY DESIGN　|　在线书稿</span><h1>软件安全的<br /><em>隐藏边界</em></h1><p className={styles.subtitle}>从一个字段、一段协议和一次用户操作出发，理解系统中的安全假设，以及每种设计选择带来的责任与代价。</p><div className={styles.actions}><Link className={styles.primaryAction} to="/chapter/introduction">开始阅读 <span>→</span></Link><Link className={styles.textAction} to="/contents">浏览全书目录 ↗</Link></div><small className={styles.note}>持续写作中 · 内容会随实践和讨论更新</small></div><div className={styles.heroMark}><div className={styles.shield}>✦</div><span>THREAT<br />MODEL</span><i /></div></section><section className={styles.readingPath}><span className={styles.sectionKicker}>READING PATH</span><h2>让安全要求贯穿系统始终</h2><p>安全不是在最后加上的开关，而是从问题定义、身份、数据到运行恢复，逐层确认系统究竟承诺了什么。</p><div className={styles.partGrid}>{partOrder.slice(1).map((part, index) => { const items = chapters.filter((chapter) => chapter.part === part); return <Link className={styles.partCard} to={`/chapter/${items[0]?.id ?? 'introduction'}`} key={part}><span>0{index + 1}</span><div><strong>{part}</strong><small>{items.slice(0, 3).map((item) => item.title).join(' / ')}</small><b>{items.length} 章　→</b></div></Link> })}</div></section><section className={styles.homeFooter}><p>先把问题说清楚，再决定用什么技术解决。</p><Link to="/contents">查看完整目录 →</Link></section></main>
}

function ContentsView({ query }: { query: string }) {
  const filtered = chapters.filter((chapter) => `${chapter.title}${chapter.description}${chapter.part}`.toLowerCase().includes(query.toLowerCase()))
  return <main className={styles.contents}><div className={styles.pageIntro}><span className={styles.eyebrow}>TABLE OF CONTENTS</span><h1>全书目录</h1><p>沿着安全问题的边界，从威胁建模走到身份、密码学、数据和运行证据。</p></div><div className={styles.contentsList}>{partOrder.map((part) => { const items = filtered.filter((chapter) => chapter.part === part); if (!items.length) return null; return <section key={part}><div className={styles.partHeading}><span>{part === '导言' ? '—' : `0${partOrder.indexOf(part)}`}</span><h2>{part}</h2><i /></div>{items.map((chapter, index) => <Link className={styles.chapterRow} to={`/chapter/${chapter.id}`} key={chapter.id}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{chapter.title}</strong><small>{chapter.description}</small></div><b>阅读 →</b></Link>)}</section> })}</div></main>
}

function ReaderView({ chapterId }: { chapterId?: string }) {
  const navigate = useNavigate(); const index = Math.max(0, chapters.findIndex((chapter) => chapter.id === chapterId)); const chapter = chapters[index]
  if (!chapter) return <ContentsView query="" />
  const previous = chapters[index - 1]; const next = chapters[index + 1]
  return <main className={styles.reader}><aside className={styles.readerAside}><Link to="/contents" className={styles.backLink}>← 全书目录</Link><span className={styles.asideKicker}>当前阅读</span><strong>{chapter.title}</strong><div className={styles.asideList}>{chapters.filter((item) => item.part === chapter.part).map((item) => <Link className={item.id === chapter.id ? styles.asideActive : ''} key={item.id} to={`/chapter/${item.id}`}>{item.title}</Link>)}</div></aside><article className={styles.article}><div className={styles.articleMeta}><span>{chapter.part}</span><span>·</span><span>{String(index + 1).padStart(2, '0')} / {String(chapters.length).padStart(2, '0')}</span></div><h1>{titleFromMarkdown(chapter.source)}</h1><p className={styles.articleLead}>{chapter.description}</p><Markdown source={chapter.source} /><div className={styles.articleNav}><button disabled={!previous} onClick={() => previous && navigate(`/chapter/${previous.id}`)}>← {previous?.title ?? '已经是开篇'}</button><button disabled={!next} onClick={() => next && navigate(`/chapter/${next.id}`)}>{next?.title ?? '全书读完'} →</button></div></article><aside className={styles.tocAside}><span>本章阅读</span><div>{chapter.source.split('\n').filter((line) => line.startsWith('## ')).slice(0, 8).map((line) => <a href={`#${line.slice(3)}`} key={line}>{line.slice(3)}</a>)}</div></aside></main>
}

export function HomePage() {
  const location = useLocation(); const { chapterId } = useParams(); const [dark, setDark] = useState(false); const [query, setQuery] = useState(''); const [searchOpen, setSearchOpen] = useState(false)
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light' }, [dark])
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true) } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey) }, [])
  const isContents = location.pathname === '/contents'
  return <div className={styles.site}><BookHeader dark={dark} onToggle={() => setDark((value) => !value)} onSearch={() => setSearchOpen(true)} />{searchOpen && <div className={styles.searchPanel}><div><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索章节、主题或关键词" /><button onClick={() => setSearchOpen(false)}>关闭</button></div><ContentsView query={query} /></div>}{!searchOpen && (isContents ? <ContentsView query="" /> : chapterId ? <ReaderView chapterId={chapterId} /> : <HomeView />)}</div>
}
