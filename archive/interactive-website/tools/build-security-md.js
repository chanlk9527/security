const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const sourceDir = path.join(
  repoRoot,
  'tmp',
  'awesome-fenix',
  'architect-perspective',
  'general-architecture',
  'system-security',
);
const outputDir = path.join(repoRoot, 'output', 'pdf');
const assetDir = path.join(outputDir, 'assets', 'the-fenix-project2');
const outputFile = path.join(outputDir, 'the-fenix-project2.md');

const chapters = [
  ['README.md', '架构安全性'],
  ['authentication.md', '认证'],
  ['authorization.md', '授权'],
  ['credentials.md', '凭证'],
  ['confidentiality.md', '保密'],
  ['transport-security.md', '传输'],
  ['verification.md', '验证'],
];

function normalizeVuePressBlocks(markdown) {
  return markdown
    .replace(/^::::\s*tip\s*(.*?)\s*$/gm, (_, title) => `> [!TIP] ${title}`.trimEnd())
    .replace(/^:::\s*tip\s*(.*?)\s*$/gm, (_, title) => `> [!TIP] ${title}`.trimEnd())
    .replace(/^::::\s*warning\s*(.*?)\s*$/gm, (_, title) => `> [!WARNING] ${title}`.trimEnd())
    .replace(/^:::\s*warning\s*(.*?)\s*$/gm, (_, title) => `> [!WARNING] ${title}`.trimEnd())
    .replace(/^::::\s*danger\s*(.*?)\s*$/gm, (_, title) => `> [!CAUTION] ${title}`.trimEnd())
    .replace(/^:::\s*danger\s*(.*?)\s*$/gm, (_, title) => `> [!CAUTION] ${title}`.trimEnd())
    .replace(/^::::\s*quote\s*(.*?)\s*$/gm, (_, title) => `> [!NOTE] ${title}`.trimEnd())
    .replace(/^:::\s*quote\s*(.*?)\s*$/gm, (_, title) => `> [!NOTE] ${title}`.trimEnd())
    .replace(/^::::\s*(center|right)\s*$/gm, '')
    .replace(/^:::\s*(center|right)\s*$/gm, '')
    .replace(/^::::\s*$/gm, '')
    .replace(/^:::\s*$/gm, '');
}

function rewriteSameChapterLinks(markdown) {
  const sameChapterLinks = new Map([
    ['authentication', '认证'],
    ['authorization', '授权'],
    ['credentials', '凭证'],
    ['confidentiality', '保密'],
    ['transport-security', '传输'],
    ['verification', '验证'],
  ]);

  for (const [slug, heading] of sameChapterLinks) {
    const localPattern = new RegExp(`\\]\\(\\.\\/${slug}\\)`, 'g');
    const absolutePattern = new RegExp(`\\]\\(\\/architect-perspective\\/general-architecture\\/system-security\\/${slug}\\.md(#[^)]+)?\\)`, 'g');
    markdown = markdown
      .replace(localPattern, `](#${heading})`)
      .replace(absolutePattern, (_, hash = '') => `](#${hash ? hash.slice(1) : heading})`);
  }

  return markdown;
}

function rewriteLinks(markdown) {
  markdown = rewriteSameChapterLinks(markdown);

  markdown = markdown
    .replace(/\]\(\.\/images\/([^)#]+\.(?:png|jpg|jpeg|gif|svg|webp))\)/gi, (_, image) => `](assets/the-fenix-project2/${image})`)
    .replace(/\]\(\.\/([^)#]+)(#[^)]+)?\)/g, ']($1.md$2)')
    .replace(/\]\(([^)]+)\.html(#[^)]+)?\)/g, ']($1.md$2)')
    .replace(/!\[(.*?)\]\((?!https?:\/\/|data:|assets\/)([^)]+)\)/g, (_, alt, link) => {
      const source = link.startsWith('/') ? `https://icyfenix.cn${link}` : `https://icyfenix.cn/architect-perspective/general-architecture/system-security/${link}`;
      return `![${alt}](${source})`;
    });

  return rewriteSameChapterLinks(markdown);
}

function demoteTopHeading(markdown, title) {
  const trimmed = markdown.trim();
  if (trimmed.startsWith(`# ${title}`)) return trimmed.replace(`# ${title}`, `## ${title}`);
  return `## ${title}\n\n${trimmed}`;
}

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(assetDir, { recursive: true });

const sourceImageDir = path.join(sourceDir, 'images');
if (fs.existsSync(sourceImageDir)) {
  for (const file of fs.readdirSync(sourceImageDir)) {
    if (/\.(png|jpe?g|gif|svg|webp)$/i.test(file)) {
      fs.copyFileSync(path.join(sourceImageDir, file), path.join(assetDir, file));
    }
  }
}

const sections = chapters.map(([file, title]) => {
  const fullPath = path.join(sourceDir, file);
  let markdown = fs.readFileSync(fullPath, 'utf8');
  markdown = normalizeVuePressBlocks(markdown);
  markdown = rewriteLinks(markdown);
  markdown = demoteTopHeading(markdown, title);
  return `${markdown}\n`;
});

const body = [
  '# 架构安全性',
  '',
  '> 来源：`docs/the-fenix-project2.pdf`，内容对应《凤凰架构》开源文档的“架构安全性”章节。原 PDF 文字被转成矢量轮廓，这里使用同源 Markdown 文档整理为可读版本。',
  '',
  '## 目录',
  '',
  '- [架构安全性](#架构安全性-1)',
  '- [认证](#认证)',
  '- [授权](#授权)',
  '- [凭证](#凭证)',
  '- [保密](#保密)',
  '- [传输](#传输)',
  '- [验证](#验证)',
  '',
  ...sections,
  '',
].join('\n');

fs.writeFileSync(outputFile, body, 'utf8');
console.log(outputFile);
