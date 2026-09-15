import { useEffect, useMemo, useState } from 'react'
import styles from './HomePage.module.css'

type LessonId = 'authentication' | 'authorization' | 'credential'

type Control = {
  id: string
  title: string
  meta: string
  icon: string
  correct: boolean
}

type Lesson = {
  id: LessonId
  index: string
  title: string
  eyebrow: string
  summary: string
  task: string
  question: string
  attack: string
  nodes: Array<{ icon: string; title: string; sub: string; tone?: string }>
  controls: Control[]
  success: string
  failure: string
}

const lessons: Record<LessonId, Lesson> = {
  authentication: {
    id: 'authentication',
    index: '01',
    title: '证明你是谁',
    eyebrow: '守住访问 · 任务 01',
    summary: '从“认证究竟证明什么”开始，理解认证标准、HTTP 与 Web 认证、工程实现，以及贯穿注册、登录、会话和恢复的现代身份链。',
    task: '阻止攻击者通过仿冒登录页实时转发管理员的密码和验证码。',
    question: '密码和验证码都正确，为什么这次登录仍然不可信？',
    attack: '仿冒网站实时转发密码与一次性验证码',
    nodes: [
      { icon: 'user', title: '系统管理员', sub: '准备登录管理后台' },
      { icon: 'gateway', title: '仿冒登录页', sub: '界面与真网站相同', tone: 'orange' },
      { icon: 'key', title: '真实认证服务', sub: '密码与 OTP 均正确', tone: 'purple' },
      { icon: 'server', title: '管理控制台', sub: '高权限会话', tone: 'blue' },
    ],
    controls: [
      { id: 'complex-password', title: '提高密码复杂度', meta: '要求 16 位混合字符', icon: 'hash', correct: false },
      { id: 'totp', title: '增加 TOTP 验证码', meta: '使用认证器应用', icon: 'clock', correct: false },
      { id: 'passkey', title: '使用 Passkey', meta: '绑定真实网站 RP ID', icon: 'key', correct: true },
    ],
    success: '认证器拒绝为仿冒网站的 RP ID 签名，攻击者无法把挑战转发成有效登录。',
    failure: '攻击者不需要猜出凭证，只需实时转发管理员亲手提交的密码和验证码。',
  },
  authorization: {
    id: 'authorization',
    index: '02',
    title: '认证不等于授权',
    eyebrow: '守住访问 · 任务 02',
    summary: '用户已经登录，但这并不代表他能读取任意一笔订单。找到真正应该做权限裁决的位置。',
    task: '阻止租户 A 的普通用户，通过修改订单 ID 读取租户 B 的数据。',
    question: '网关确认了“他是谁”，但谁来确认“这张订单是不是他的”？',
    attack: '将 GET /orders/1001 修改为 /orders/1002',
    nodes: [
      { icon: 'user', title: '租户 A 用户', sub: '已通过密码 + MFA' },
      { icon: 'gateway', title: 'API 网关', sub: 'Token 验签通过', tone: 'purple' },
      { icon: 'server', title: '订单服务', sub: '按 ID 查询订单', tone: 'blue' },
      { icon: 'database', title: '订单数据库', sub: '包含多个租户', tone: 'orange' },
    ],
    controls: [
      { id: 'mfa', title: '再次执行 MFA', meta: '放置在 API 网关', icon: 'shield', correct: false },
      { id: 'uuid', title: '将订单 ID 换成 UUID', meta: '放置在数据模型', icon: 'hash', correct: false },
      { id: 'object-auth', title: '对象级授权', meta: '放置在订单服务', icon: 'lock', correct: true },
    ],
    success: '订单服务同时校验 ownerTenantId，越权请求在数据返回前被拒绝。',
    failure: '身份仍然有效，订单 ID 也合法。当前控制没有证明用户与订单之间的关系。',
  },
  credential: {
    id: 'credential',
    index: '03',
    title: '让被盗凭证及时失效',
    eyebrow: '守住访问 · 任务 03',
    summary: '一枚签名正确的令牌仍可能已经被盗。为会话建立轮换、撤销与泄露检测能力。',
    task: '员工离职后，阻止攻击者继续使用此前复制的 Refresh Token 换取访问权。',
    question: '验签只能证明令牌由系统签发，它能证明持有人现在仍有权限吗？',
    attack: '使用离职前复制的 Refresh Token 请求新令牌',
    nodes: [
      { icon: 'user', title: '已离职员工', sub: '账号已被冻结' },
      { icon: 'key', title: '旧 Refresh Token', sub: '仍在有效期内', tone: 'orange' },
      { icon: 'gateway', title: '认证服务', sub: '校验签名与期限', tone: 'purple' },
      { icon: 'server', title: '业务 API', sub: '接受新 Access Token', tone: 'blue' },
    ],
    controls: [
      { id: 'longer', title: '延长 Token 有效期', meta: '减少用户重新登录', icon: 'clock', correct: false },
      { id: 'signature', title: '使用更长的签名密钥', meta: '提高伪造难度', icon: 'key', correct: false },
      { id: 'rotation', title: '轮换并检测重用', meta: '联动账号撤销状态', icon: 'rotate', correct: true },
    ],
    success: '认证服务发现旧令牌重用，撤销整个令牌家族，并拒绝为冻结账号签发新令牌。',
    failure: '令牌确实由系统签发且尚未过期，因此仅靠验签无法识别权限已经变化。',
  },
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    user: <><circle cx="12" cy="8" r="3"/><path d="M5.5 20c.5-4 2.6-6 6.5-6s6 2 6.5 6"/></>,
    gateway: <><path d="M4 7h16v10H4z"/><path d="M8 11h8M8 14h5"/></>,
    server: <><rect x="4" y="4" width="16" height="6" rx="2"/><rect x="4" y="14" width="16" height="6" rx="2"/><path d="M8 7h.01M8 17h.01"/></>,
    database: <><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/></>,
    shield: <path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6z"/>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
    hash: <><path d="m10 3-2 18M16 3l-2 18M5 9h14M4 15h14"/></>,
    key: <><circle cx="8" cy="15" r="4"/><path d="m11 12 8-8M15 8l2 2M17 6l2 2"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    rotate: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 8a7 7 0 0 1 11.6-1L20 12M4 12l2.3 5a7 7 0 0 0 11.6-1"/></>,
    play: <path d="m8 5 11 7-11 7z"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    book: <><path d="M4 5a3 3 0 0 1 3-2h5v17H7a3 3 0 0 0-3 1z"/><path d="M20 5a3 3 0 0 0-3-2h-5v17h5a3 3 0 0 1 3 1z"/></>,
    grid: <><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name] ?? paths.shield}</svg>
}

type AuthMethod = 'password' | 'totp' | 'passkey'

const authMethods: Record<AuthMethod, { label: string; credential: string; result: string; detail: string; traits: string[] }> = {
  password: {
    label: '密码',
    credential: '可读出的共享秘密',
    result: '攻击者获得密码并建立自己的会话',
    detail: '无论密码多复杂，用户都可以把它输入仿冒页面。钓鱼代理不需要破解，只需要转发。',
    traits: ['可被复制', '不绑定网站', '服务端保存验证材料'],
  },
  totp: {
    label: '密码 + TOTP',
    credential: '密码与 6 位动态码',
    result: '动态码在有效窗口内被实时转发',
    detail: 'TOTP 能防止攻击者只拿到密码，却无法分辨验证码提交给了真实网站还是仿冒网站。',
    traits: ['短期有效', '仍可被读出', '可被实时转发'],
  },
  passkey: {
    label: 'Passkey',
    credential: '私钥签署网站挑战',
    result: 'RP ID 不匹配，认证器拒绝签名',
    detail: '私钥不会交给网页。认证器只为创建凭证时绑定的网站身份签名，仿冒域名拿不到有效响应。',
    traits: ['私钥不离开设备', '挑战不可重放', '绑定网站身份'],
  },
}

function PhishingTheory({ onBack, onEnterLab }: { onBack: () => void; onEnterLab: () => void }) {
  const [method, setMethod] = useState<AuthMethod>('totp')
  const [answer, setAnswer] = useState('')
  const current = authMethods[method]
  const correctAnswer = answer === 'site-binding'

  return (
    <div className={styles.theoryStudio}>
      <button className={styles.backToCourse} onClick={onBack}>← 返回现代认证章节</button>
      <section className={styles.theoryStage}>
        <div className={styles.theoryTopline}>
          <div><span>原理剧场 · 01</span><h2>当钓鱼网站站在认证链路中间</h2></div>
          <div className={styles.theoryTabs}>
            {(Object.keys(authMethods) as AuthMethod[]).map((id) => <button key={id} className={method === id ? styles.theoryTabActive : ''} onClick={() => setMethod(id)}>{authMethods[id].label}</button>)}
          </div>
        </div>

        <div className={`${styles.relayScene} ${method === 'passkey' ? styles.relayBlocked : ''}`}>
          <div className={styles.sceneActor}><span><Icon name="user" /></span><strong>管理员</strong><small>以为自己正在登录</small></div>
          <div className={styles.relayArrow}><b>{method === 'passkey' ? '发起认证' : current.credential}</b><i /><em>›</em></div>
          <div className={`${styles.sceneActor} ${styles.fakeSite}`}><span><Icon name="gateway" /></span><strong>仿冒网站</strong><small>login-company.example</small></div>
          <div className={styles.relayArrow}><b>{method === 'passkey' ? '域名不匹配' : '实时转发'}</b><i /><em>›</em></div>
          <div className={`${styles.sceneActor} ${styles.realSite}`}><span><Icon name={method === 'passkey' ? 'lock' : 'server'} /></span><strong>真实认证服务</strong><small>login.company.com</small></div>
          {method === 'passkey' && <div className={styles.stopMark}><Icon name="shield" /><span>签名在这里停止</span></div>}
        </div>

        <div className={method === 'passkey' ? styles.observationGood : styles.observationBad}>
          <span>{method === 'passkey' ? <Icon name="check" /> : '!'}</span>
          <div><small>观察结果</small><strong>{current.result}</strong><p>{current.detail}</p></div>
        </div>
      </section>

      <section className={styles.mechanismPanel}>
        <div className={styles.panelTitle}><div><span>02</span><h3>不是“多一步”，而是攻击条件变了</h3></div><p>点击上方三种方式，对比凭证本身具有什么性质。</p></div>
        <div className={styles.traitGrid}>
          {current.traits.map((trait, index) => <div key={trait}><span>{index === 0 ? <Icon name="key" /> : index === 1 ? <Icon name="gateway" /> : <Icon name="shield" />}</span><small>性质 {index + 1}</small><strong>{trait}</strong></div>)}
        </div>
        <div className={styles.coreIdea}>
          <span>核心判断</span>
          <p>认证强度不取决于输入了几次，而取决于凭证能否被复制、转交、重放，以及它是否绑定当前网站与本次挑战。</p>
        </div>
      </section>

      <section className={styles.checkpoint}>
        <div className={styles.checkpointCopy}><span>理解检查</span><h3>为什么 TOTP 仍然可能被实时钓鱼？</h3><p>选出最接近根本原因的一项。</p></div>
        <div className={styles.answerList}>
          <button className={answer === 'short' ? styles.answerSelected : ''} onClick={() => setAnswer('short')}><i />因为六位验证码不够长</button>
          <button className={answer === 'site-binding' ? styles.answerSelected : ''} onClick={() => setAnswer('site-binding')}><i />因为验证码没有绑定真实网站，可以被用户交给仿冒站</button>
          <button className={answer === 'network' ? styles.answerSelected : ''} onClick={() => setAnswer('network')}><i />因为认证器应用没有连接互联网</button>
        </div>
        <div className={styles.checkpointAction}>
          {answer && <p className={correctAnswer ? styles.checkCorrect : styles.checkWrong}>{correctAnswer ? '理解正确：关键不是验证码长度，而是它可以被转交。' : '再观察一次转发链路：攻击者没有破解算法。'}</p>}
          <button disabled={!correctAnswer} onClick={onEnterLab}>带着这个判断进入实验台 <span>→</span></button>
        </div>
      </section>
    </div>
  )
}

const courseChapters = [
  ['01', '认证的本质', '你是谁，究竟证明了什么'],
  ['02', '认证的标准', '信道、协议与内容三层'],
  ['03', 'HTTP 认证', '读懂一次认证握手'],
  ['04', 'Web 认证', '表单自由与公钥认证'],
  ['05', '认证的实现', '标准接口与安全上下文'],
  ['06', '现代身份链', '从注册一直到恢复'],
] as const

type ChapterGuideData = {
  lead: string
  sections: Array<{ kicker: string; title: string; body: string[]; example?: string }>
  terms: Array<[string, string]>
}

const chapterGuides: ChapterGuideData[] = [
  {
    lead: '想象你走进一栋办公楼：前台先确认来访者是谁，门禁再决定他能去几层，临时访客卡则是他沿途证明身份的东西。信息系统中的认证、授权和凭证也是三件彼此衔接、但不能混为一谈的事。',
    sections: [
      { kicker: 'WHY', title: '为什么系统必须先建立身份？', body: ['系统中的订单、文件和操作记录都需要归属于某个主体。没有认证，系统就无法保存个人状态，无法区分普通用户与管理员，也无法追查一次修改是谁完成的。', '认证并不是为了知道用户的姓名，而是为了在当前业务范围内稳定地区分主体。论坛可能只需要证明“今天登录的人仍然控制昨天注册的账号”；银行开户则还要确认这个账号对应哪位现实中的自然人。'], example: '匿名博客允许任何人阅读，但当用户要发布、删除自己的文章时，系统就必须知道“这是哪一个账号”。' },
      { kicker: 'WHAT', title: '认证真正证明的是什么？', body: ['输入正确密码，只能证明请求者知道这份密码；完成 Passkey 签名，只能证明请求者可以使用某个认证器中的私钥。系统由此把请求与一个账号联系起来，但这不自动证明屏幕前的人拥有某个真实姓名。', '账号与真实个人、员工或企业的绑定发生在注册和身份核验阶段。登录只是重复验证某个主体仍然控制已登记的认证器。因此，“身份核验得是否正确”与“登录方式是否足够强”是两条独立轴线。'], example: '如果开户时把攻击者错误地登记成了 Alice，之后再强的 Passkey 也只会非常可靠地让攻击者继续控制 Alice 的账号。' },
      { kicker: 'BOUNDARY', title: '认证、授权和凭证怎样协作？', body: ['凭证是用来证明的材料；认证是验证材料并形成主体结论的过程；授权是在已知主体后，判断他能否对某个资源执行某个动作。它们通常按顺序发生，但分别由不同组件负责。', '认证通过不代表请求一定被允许。一个普通用户可以合法登录，却不能因此访问管理员页面；Alice 可以合法登录，也不能因此读取 Bob 的订单。把所有判断都塞进“登录成功”会让权限在系统中失去边界。'], example: 'Cookie 里携带会话标识是凭证；服务端通过它恢复 Alice 的身份是认证；订单服务检查订单是否属于 Alice 是授权。' },
    ],
    terms: [['主体 Subject', '正在访问系统的人、设备或服务。'], ['身份 Identity', '系统用来区分主体的一组稳定属性。'], ['身份核验', '把账号与现实个人、员工或组织建立关系。'], ['认证器', '保存或产生认证凭证的密码、设备或密钥。']],
  },
  {
    lead: '安全协议最危险的地方往往不是“没有加密”，而是参与方对每一步的理解不一致。标准的价值，是让浏览器、服务器、网关和认证器对挑战、凭证、错误以及信任边界使用同一种语言。',
    sections: [
      { kicker: 'PRINCIPLE', title: '为什么安全领域尤其不适合自行发明协议？', body: ['一个登录流程不仅要考虑正常成功路径，还要面对窃听、篡改、重放、中间人、降级和错误恢复。自制协议通常能让正常用户登录，却容易漏掉攻击者会利用的异常组合。', '遵循标准并不意味着页面必须千篇一律。标准负责挑战如何产生、凭证如何携带、签名如何验证等共性边界；产品仍可以自由设计扫码、验证码、品牌页面和风险提示。'], example: '可以设计任何样式的登录页，但不应该自创“把密码先做一次 MD5 就能安全传输”的协议。' },
      { kicker: 'LAYERS', title: '信道、协议、内容三层分别保护什么？', body: ['信道层在通信连接建立时验证对端，例如 TLS 服务器证书让浏览器确认自己连接的是预期网站，mTLS 还可以反向验证客户端。协议层把身份挑战与凭证放进 HTTP 语义，例如 401、WWW-Authenticate 和 Authorization。', '内容层由 Web 应用呈现登录体验，例如表单、扫码和 WebAuthn。三层并非互斥：一个 Passkey 登录页仍要通过 TLS 传输，登录成功后产生的会话仍可能通过 HTTP Cookie 携带。'], example: 'TLS 证明连接的服务器是谁；WebAuthn 证明用户控制某个网站绑定的私钥；之后的 Session 让每次请求延续这个结果。' },
      { kicker: 'SCHEMES', title: '四种经典方案为什么具有代表性？', body: ['Client-Cert 体现证书与信道身份；Basic 体现协议直接携带用户名密码；Digest 尝试通过挑战和摘要减少明文暴露；Form 则把认证交互交给应用内容。', '它们不是一张“从弱到强”的简单排行榜。不同方案解决不同层的问题，而且老方案可能已不满足今天的威胁基线。架构师应先问认证发生在哪条边界、对手能看到或控制什么，再决定机制。'], example: '管理后台使用漂亮的 Form 页面，不代表可以省略 TLS；服务间用了 mTLS，也不代表最终用户已经完成业务登录。' },
    ],
    terms: [['认证方案 Scheme', '产生和携带身份凭证的一套约定。'], ['信任边界', '数据或控制权跨越后必须重新验证的分界。'], ['Challenge', '服务端产生、用于证明响应新鲜性的一次性挑战。'], ['中间人攻击', '攻击者位于通信双方之间转发或修改交互。']],
  },
  {
    lead: 'HTTP 认证不是“请求头里放一个 Token”这么简单。它定义了服务端如何告诉客户端需要哪种认证、客户端如何提交凭证，以及认证失败和权限不足应如何表达。',
    sections: [
      { kicker: 'HANDSHAKE', title: '一次标准认证握手发生了什么？', body: ['客户端第一次访问受保护资源时可能没有凭证。服务端返回 401，并通过 WWW-Authenticate 告诉客户端支持的认证方案和 realm。客户端取得用户或本地凭证后，再通过 Authorization 发起请求。', '服务端验证凭证并恢复主体。如果凭证无效或缺失，通常仍需要认证；如果主体已经明确，但不允许访问目标资源，则应表达为权限拒绝。把这两类失败区分开，有助于客户端采取正确动作，也有利于审计。'], example: '看到 401，客户端可能提示登录或刷新凭证；看到 403，则不应该反复要求用户重新输入同一份密码。' },
      { kicker: 'BASIC', title: '为什么 Base64 不是加密？', body: ['Basic 把 username:password 做 Base64 后放进请求头。Base64 的目的只是把字节安全地表示为文本，任何拿到报文的人都可以立即还原原文，并不需要密钥。', '因此 Basic 的保密性完全依赖外层 TLS。即使有 TLS，浏览器或客户端也可能在多个请求中重复发送凭证，日志、代理配置和错误追踪都不应记录完整 Authorization。'], example: 'aWN5ZmVuaXg6MTIzNDU2 看起来不像密码，但解码后只是 icyfenix:123456。' },
      { kicker: 'TRADEOFF', title: 'Digest、Bearer 和自定义签名各自留下什么风险？', body: ['Digest 使用 Nonce 和摘要，试图避免直接传输密码，但复杂度、算法兼容和中间人问题让它不再是现代 Web 登录的首选。Bearer Token 的含义则非常直接：谁持有它，谁就拥有它代表的权力，因此泄漏检测、短有效期和撤销能力很关键。', 'AWS 一类签名方案会把方法、路径、正文摘要和时间等内容纳入签名，更适合程序化 API。但自定义认证方案要求客户端与服务端都正确实现规范，算法选择、规范化和时钟处理都可能成为新的错误来源。'], example: '签名正确只能说明请求由密钥持有者产生；若没有时间戳、唯一消息 ID 或状态约束，同一条合法请求仍可能被重放。' },
    ],
    terms: [['401 Unauthorized', '尚未提供可接受的认证，名称虽叫 Unauthorized，语义更接近“未认证”。'], ['403 Forbidden', '主体已知，但不允许访问目标资源。'], ['realm', '一组共享认证要求的保护区域描述。'], ['Bearer Token', '仅凭持有即可使用的令牌。']],
  },
  {
    lead: '用户看到的是一个登录页面，系统看到的却是一条跨越浏览器、认证服务、认证器、会话存储和业务服务的信任链。Web 认证的设计重点，是让灵活体验建立在确定的安全机制之上。',
    sections: [
      { kicker: 'FORM', title: '表单认证自由在哪里，又不自由在哪里？', body: ['表单字段、登录入口、扫码方式、验证码和界面流程可以由产品决定。这种自由使应用能够结合业务风险做渐进式验证，而不是被浏览器原生对话框限制。', '但密码必须通过安全信道传输，服务端必须使用专用密码哈希验证，登录成功后需要安全会话，失败信息还要避免泄漏账号是否存在。这些共性问题不因表单是自定义的就可以随意处理。'], example: '前端把密码加密一次不能替代 TLS，因为攻击者可以替换前端脚本或直接复用那段“加密后密码”。' },
      { kicker: 'REGISTRATION', title: 'WebAuthn 注册到底注册了什么？', body: ['服务端先生成不可预测的 Challenge，并告诉浏览器当前用户和网站身份。浏览器调用平台认证器或硬件安全密钥；认证器在本地验证用户后，为当前 RP ID 生成公私钥对。', '私钥留在认证器中，服务端保存公钥和凭证标识。注册新认证器本身是高风险操作：如果被盗会话可以随意添加 Passkey，攻击者就能把短期入侵变成长久控制，所以注册必须要求可信会话或重新认证。'], example: '指纹不是传给网站的凭证。它只在本地解锁认证器中的私钥，网站最终验证的是数字签名。' },
      { kicker: 'AUTHENTICATION', title: 'WebAuthn 登录为何能防重放和普通钓鱼？', body: ['登录时服务端发送新的 Challenge，认证器确认网站 RP ID 与注册时一致，再用私钥签名。服务端使用已保存的公钥验证签名、挑战和相关上下文。旧签名无法用于新的 Challenge，因此直接重放不会成功。', '仿冒网站的域名与真实网站 RP ID 不同，认证器不会为真实网站的凭证产生有效签名。安全性来自协议和浏览器建立的网站绑定，而不是依赖用户仔细辨认页面长相。'], example: '攻击者可以复制真实登录页的每个像素，却无法让 example-login.com 的页面调用 company.com 对应的 Passkey。' },
    ],
    terms: [['RP ID', 'WebAuthn 凭证绑定的依赖方网站标识。'], ['平台认证器', '设备系统内置、由 PIN 或生物识别解锁的认证器。'], ['漫游认证器', '通过 USB、NFC 等方式跨设备使用的硬件认证器。'], ['用户验证 UV', '认证器确认当前操作者通过了 PIN 或生物识别。']],
  },
  {
    lead: '真正的认证实现不是 Controller 里的一次密码比较。它要在请求入口验证凭证，把结果放入可信安全上下文，并让后续服务始终知道当前主体、认证方式和认证时间。',
    sections: [
      { kicker: 'SEPARATION', title: '为什么要把认证机制与业务代码分开？', body: ['如果每个接口自行读取 Header、解析 Token 和查询用户，认证规则会迅速产生差异：某些接口忘记检查签发方，另一些接口接受过期算法，还有一些异步任务丢失主体。', '安全框架在统一入口执行验证，建立规范化 Subject/Principal，再由业务读取上下文。这让认证器升级、密钥轮换、审计和拒绝策略能够集中生效。'], example: '业务服务需要的是“当前主体是 Alice，使用 Passkey 于 3 分钟前认证”，而不是自己重新解释一段 JWT 字符串。' },
      { kicker: 'CONTEXT', title: 'Subject、Principal、Credentials 和 Context 分别是什么？', body: ['Subject 是当前安全主体的容器；Principal 是主体在某个域中的身份，例如用户 ID 或服务账号；Credentials 是用来证明身份的材料；Security Context 则让这些认证结果沿调用过程可用。', '凭证不应无限期留在业务上下文中。能销毁的秘密应尽快销毁，Token 也不应被随意写入日志。上下文可以携带认证强度和时间，供敏感操作决定是否需要阶梯认证。'], example: '一个员工可以拥有用户 ID Principal、组织 Principal 和设备 Principal；授权时使用哪一个必须由策略明确。' },
      { kicker: 'FRAMEWORK', title: '成熟安全框架替团队承担了哪些复杂度？', body: ['Spring Security、Shiro 等框架负责过滤器链、认证器适配、安全上下文、会话集成和授权接口。它们减少协议级错误，但不会替业务决定订单属于谁、恢复流程多强或哪些操作需要重新认证。', '框架配置仍需遵循最小能力和失败关闭原则。尤其在微服务与异步任务中，要明确主体如何传播、下游如何重新验证，以及不能得出身份结论时是否拒绝敏感操作。'], example: '网关可以验证 Access Token，但订单服务仍需以可信主体执行对象授权；消息消费者不能直接相信消息中客户端填写的 userId。' },
    ],
    terms: [['Principal', '主体在一个身份域中的可识别身份。'], ['Security Context', '当前调用链持有的认证与安全状态。'], ['认证提供器', '验证某类凭证并产生认证结果的组件。'], ['失败关闭', '依赖异常或无法判断时，敏感操作保持拒绝。']],
  },
  {
    lead: '现代认证的难点已经从“密码对不对”扩展到完整生命周期：账号如何建立、认证器如何绑定、风险如何变化、会话怎样撤销，以及用户丢失设备后通过什么链路恢复。最强的登录方式也可能被最弱的恢复入口绕过。',
    sections: [
      { kicker: 'ENTRY', title: '密码攻击不是只对一个账号反复猜', body: ['撞库使用其他网站泄漏的用户名密码组合批量登录；密码喷洒则用少量常见密码尝试大量账号，避免触发单账号锁定。攻击者还会利用登录、注册和找回密码的差异枚举哪些账号存在。', '防护需要综合账号、IP、设备、时间窗口和跨账号失败模式，逐步增加等待、验证码或额外认证。永久锁死账号会被攻击者反过来利用，造成对合法用户的拒绝服务。'], example: '一万个来源地址各对一个账号只尝试一次，单纯“每个 IP 五次”的规则几乎看不见攻击。' },
      { kicker: 'AUTHENTICATORS', title: 'MFA 的关键是因素独立，而不是步骤变多', body: ['密码和两个安全问题都属于“知道的东西”，失败原因高度相似，不能因为输入了三次就算强 MFA。短信、TOTP、推送和 Passkey 的攻击面也不同：短信受号码转移影响，TOTP 可被实时转发，简单推送可能遭遇疲劳轰炸。', '系统应记录本次使用了什么认证器、何时认证以及它能抵抗哪些攻击。高权限账号和高价值操作应优先使用抗钓鱼认证；低风险普通用户则可以在安全性、设备覆盖和恢复成本之间取舍。'], example: '用户把密码和 TOTP 都输入钓鱼页时，两项因素是真的，但攻击者仍能实时建立自己的会话。' },
      { kicker: 'CONTINUITY', title: '登录成功以后，为什么还要持续管理信任？', body: ['Session 把某一时刻的认证结果延续到后续请求，但账号状态、设备环境和风险可能已经变化。修改密码、添加认证器、导出数据和支付等操作应检查认证是否足够新、强度是否足够。', '人员离职或账号冻结时，只修改用户表状态不够。现有 Session、Refresh Token、恢复链接和下游授权都可能继续有效。系统需要撤销、轮换和泄漏检测，并明确传播需要多长时间。'], example: '上午在可信电脑建立的会话，下午可能已被恶意软件复制；“今天登录过”不能永久证明当前请求可信。' },
      { kicker: 'RECOVERY', title: '账号恢复为什么是另一套认证协议？', body: ['忘记密码链接、客服核验、恢复码和备用 Passkey 都在回答“无法使用主认证器时，如何重新证明账号控制权”。如果客服只核对公开信息就能关闭 MFA，攻击者完全不必攻破硬件密钥。', '恢复越容易，接管风险通常越高；完全不可恢复又会把设备丢失变成永久拒绝服务。系统应按账号价值选择短期单次链接、备用认证器、等待期、材料核验或多人复核，并在成功后通知旧渠道和撤销可疑会话。'], example: '高价值管理员可以登记两枚硬件密钥并离线保存恢复码，比依赖客服“万能重置”更容易说明安全边界。' },
      { kicker: 'FEDERATION', title: '联合登录中 OAuth、OIDC 和业务权限各做什么？', body: ['OAuth 表达客户端被授权访问哪些资源；OIDC 在其上增加身份层，ID Token 表达身份提供方刚刚为某个客户端认证了谁。业务权限仍由资源服务根据当前组织、角色和资源关系判断。', '接收 ID Token 时，验签只是第一步，还要确认签发方 iss、受众 aud、有效时间、nonce 和可信公钥来源。两个身份提供方返回相同邮箱，也不自动证明是同一个主体。'], example: '“使用某账号登录”应消费经过完整校验的 OIDC 身份，而不是拿任意 Access Token 调一次用户信息接口就拼成登录。' },
    ],
    terms: [['撞库', '批量尝试其他站点泄漏的账号密码组合。'], ['阶梯认证', '敏感操作前要求更新或加强认证。'], ['Refresh Token 家族', '通过轮换关联的一组刷新令牌，可在重用时整体撤销。'], ['OIDC', '在 OAuth 2.0 上增加用户认证与身份声明的协议。']],
  },
]

function ChapterGuide({ guide }: { guide: ChapterGuideData }) {
  const [openSection, setOpenSection] = useState(0)
  return <section className={styles.deepGuide}>
    <div className={styles.deepGuideHead}><div><span>深入理解</span><h3>从现象走到机制</h3></div><p>{guide.lead}</p></div>
    <div className={styles.deepGuideBody}>
      <div className={styles.explainRail}>{guide.sections.map((section, index) => <button key={section.title} className={openSection === index ? styles.explainActive : ''} onClick={() => setOpenSection(index)}><span>{String(index + 1).padStart(2, '0')}</span><div><small>{section.kicker}</small><strong>{section.title}</strong></div></button>)}</div>
      <article className={styles.explainContent}>
        <small>{guide.sections[openSection].kicker} · STEP {openSection + 1}</small>
        <h3>{guide.sections[openSection].title}</h3>
        {guide.sections[openSection].body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        {guide.sections[openSection].example && <div className={styles.guidedExample}><span>举个例子</span><p>{guide.sections[openSection].example}</p></div>}
      </article>
    </div>
    <div className={styles.glossary}><span>本章术语</span><div>{guide.terms.map(([term, definition]) => <details key={term}><summary>{term}<b>＋</b></summary><p>{definition}</p></details>)}</div></div>
  </section>
}

function AuthenticationCourse({ onEnterLab }: { onEnterLab: () => void }) {
  const [chapter, setChapter] = useState(0)
  const [concept, setConcept] = useState<'authentication' | 'authorization' | 'credential'>('authentication')
  const [layer, setLayer] = useState<'channel' | 'protocol' | 'content'>('protocol')
  const [httpStep, setHttpStep] = useState(0)
  const [webMode, setWebMode] = useState<'form' | 'webauthn'>('form')
  const [modernTopic, setModernTopic] = useState('proofing')
  const [showTheater, setShowTheater] = useState(false)

  if (showTheater) return <PhishingTheory onBack={() => setShowTheater(false)} onEnterLab={onEnterLab} />

  const concepts = {
    authentication: { question: '你是谁？', answer: '确认当前请求由哪个主体发起', example: '验证密码或 Passkey，建立“这是账号 Alice”的认证结果', color: 'purple' },
    authorization: { question: '你能做什么？', answer: '判断主体能否对资源执行动作', example: 'Alice 已登录，但仍不能读取 Bob 的订单', color: 'blue' },
    credential: { question: '你如何证明？', answer: '主体提交的身份证明材料', example: '密码、OTP、证书、会话 Cookie 或私钥签名', color: 'orange' },
  }
  const layers = {
    channel: { title: '通信信道上的认证', question: '连接建立前，如何证明对端是谁？', example: 'TLS 客户端证书、设备证书', boundary: '网络连接', scheme: 'Client-Cert / mTLS' },
    protocol: { title: '通信协议上的认证', question: '请求资源前，如何携带身份凭证？', example: 'HTTP Authorization Header', boundary: 'HTTP 请求', scheme: 'Basic / Digest / Bearer' },
    content: { title: '通信内容上的认证', question: '使用业务服务前，如何完成登录交互？', example: '登录表单、扫码、WebAuthn', boundary: 'Web 应用', scheme: 'Form / WebAuthn' },
  }
  const httpSteps = [
    { title: '访问受保护资源', who: '客户端 → 服务端', code: 'GET /admin HTTP/1.1', note: '此时客户端还没有提交身份凭证。' },
    { title: '服务端发起认证挑战', who: '服务端 → 客户端', code: 'HTTP/1.1 401 Unauthorized\nWWW-Authenticate: Basic realm="admin"', note: '401 表示需要认证，realm 描述凭证适用的保护区域。' },
    { title: '客户端提交凭证', who: '客户端 → 服务端', code: 'GET /admin HTTP/1.1\nAuthorization: Basic aWN5ZmVuaXg6MTIzNDU2', note: 'Base64 只是编码，并没有加密用户名和密码。' },
    { title: '服务端给出认证结果', who: '服务端 → 客户端', code: 'HTTP/1.1 200 OK\n\n—or—\n\nHTTP/1.1 403 Forbidden', note: '凭证通过后返回资源；身份不满足访问条件时拒绝请求。' },
  ]
  const modernTopics: Record<string, { title: string; tag: string; body: string; decision: string }> = {
    proofing: { title: '身份核验与账号注册', tag: '建立身份', body: '认证器只能证明“谁控制这份凭证”。银行开户、员工入职等场景还要先把账号与自然人、员工或法律实体建立可信关系。', decision: '分别记录身份核验强度与认证器强度，不要求所有普通用户上传身份证。' },
    password: { title: '密码泄漏与撞库', tag: '保护入口', body: '密码可能从另一家网站泄漏后被批量尝试。只按 IP 限流会误伤共享出口，也挡不住分布式低速密码喷洒。', decision: '结合账号、来源、设备和失败模式限速，并检测泄漏密码与跨账号异常。' },
    mfa: { title: 'MFA 与抗钓鱼能力', tag: '认证强度', body: '短信、TOTP 和推送不是同一种强度。TOTP 可摆脱短信网络，却仍可能被钓鱼代理实时转发。', decision: '高权限账号优先使用绑定网站身份的认证器，而不只检查“是否开启 MFA”。' },
    passkey: { title: 'Passkey 与 WebAuthn', tag: '网站绑定', body: '认证器为网站生成公私钥，用私钥签署一次性挑战，并把凭证绑定到 RP ID；服务端只保存公钥。', decision: '保护新增、删除和恢复认证器的流程，并明确同步型与设备绑定型凭证的取舍。' },
    session: { title: '会话与阶梯认证', tag: '延续信任', body: '认证发生在某一时刻，会话把结果延续到后续请求。登录后的设备、位置和风险状态仍可能变化。', decision: '修改认证器、导出敏感数据等操作要求近期或更强认证，并轮换会话标识。' },
    recovery: { title: '账号恢复', tag: '备用认证', body: '忘记密码、客服申诉和设备丢失处理，本质上都是备用认证协议。恢复链过弱会绕过最强的日常登录。', decision: '高价值账号准备恢复码或备用 Passkey；恢复成功后撤销高风险会话并通知可信渠道。' },
    oidc: { title: '联合登录与 OIDC', tag: '外部身份', body: 'OAuth 解决授权，不单独定义用户身份。OIDC 增加身份层，ID Token 表达身份提供方为某个客户端认证了谁。', decision: '校验 iss、aud、exp、nonce 和可信密钥来源；不要只因邮箱相同就自动合并账号。' },
    consistency: { title: '身份链的一致性', tag: '生命周期', body: '账号、认证器、会话、恢复渠道、风险状态和外部身份共同构成认证系统。任何一项撤销都可能留下旧入口。', decision: '新增、使用、轮换、撤销和恢复时，检查变化是否传播到所有仍有效的访问路径。' },
  }

  const renderChapter = () => {
    if (chapter === 0) {
      const item = concepts[concept]
      return <div className={styles.foundationChapter}>
        <div className={styles.chapterIntro}><span>概念模型</span><h2>登录之前，系统要回答三个不同的问题</h2><p>点击三个问题，观察它们如何组成一次完整访问，而不是把“登录”当作一个孤立按钮。</p></div>
        <div className={styles.conceptQuestions}>
          {(Object.keys(concepts) as Array<keyof typeof concepts>).map((id) => <button key={id} className={concept === id ? styles.conceptActive : ''} onClick={() => setConcept(id)}><small>{id === 'authentication' ? 'Authentication' : id === 'authorization' ? 'Authorization' : 'Credential'}</small><strong>{concepts[id].question}</strong></button>)}
        </div>
        <div className={`${styles.conceptCanvas} ${styles[item.color]}`}>
          <div className={styles.conceptPerson}><span><Icon name="user" /></span><strong>访问主体</strong></div><div className={styles.conceptLine}><i /><b>提交请求</b></div>
          <div className={styles.conceptFocus}><small>{concept.toUpperCase()}</small><h3>{item.answer}</h3><p>{item.example}</p></div>
          <div className={styles.conceptLine}><i /><b>形成结论</b></div><div className={styles.conceptPerson}><span><Icon name="server" /></span><strong>业务系统</strong></div>
        </div>
        <div className={styles.identityScope}><div><span>认证对象不只是“人”</span><h3>主体可能是用户、管理员、设备、服务或外部代码</h3></div><p>当前课程聚焦最终用户认证，但架构设计时必须明确每类主体使用什么身份、由谁签发、如何撤销。认证证明的是对某个身份或认证器的控制，不天然等于真实世界身份。</p></div>
        <div className={styles.twoAxes}><div><small>轴线 A · Identity Proofing</small><strong>这个账号最初绑定给了谁？</strong><p>匿名、邮箱验证、企业目录、证件或线下核验。</p></div><b>×</b><div><small>轴线 B · Authenticator Assurance</small><strong>这次登录用了多强的证明？</strong><p>密码、OTP、Passkey、硬件安全密钥。</p></div></div>
      </div>
    }
    if (chapter === 1) {
      const item = layers[layer]
      return <div className={styles.standardChapter}>
        <div className={styles.chapterIntro}><span>标准地图</span><h2>认证发生在哪一层，决定谁负责验证</h2><p>经典方案覆盖通信信道、通信协议和 Web 内容。标准解决共性安全问题，界面与业务体验仍可自由设计。</p></div>
        <div className={styles.layerStack}>
          {(Object.keys(layers) as Array<keyof typeof layers>).map((id, index) => <button key={id} className={layer === id ? styles.layerActive : ''} onClick={() => setLayer(id)}><span>0{index + 1}</span><div><small>{layers[id].boundary}</small><strong>{layers[id].title}</strong></div><b>{layers[id].scheme}</b></button>)}
        </div>
        <div className={styles.layerDetail}><div><small>这一层的问题</small><h3>{item.question}</h3><p>{item.example}</p></div><span><Icon name={layer === 'channel' ? 'lock' : layer === 'protocol' ? 'gateway' : 'user'} /></span></div>
        <div className={styles.classicSchemes}><div><small>Client-Cert</small><strong>证书识别客户端</strong><span>信道 / 证书</span></div><div><small>Basic</small><strong>用户名密码编码</strong><span>协议 / Header</span></div><div><small>Digest</small><strong>Nonce + 摘要</strong><span>协议 / 挑战</span></div><div><small>Form</small><strong>业务登录表单</strong><span>内容 / 应用</span></div></div>
        <div className={styles.standardRule}><Icon name="shield" /><p><strong>架构原则：</strong>以标准规范为指导、以标准接口去实现。安全协议不造轮子，具体交互可以服务于业务体验。</p></div>
      </div>
    }
    if (chapter === 2) {
      const currentStep = httpSteps[httpStep]
      return <div className={styles.httpChapter}>
        <div className={styles.chapterIntro}><span>协议回放</span><h2>亲手走完一次 HTTP 认证握手</h2><p>认证框架把“需要身份凭证”与“如何产生凭证”分开，具体方案可以替换。</p></div>
        <div className={styles.httpStepper}>{httpSteps.map((item, index) => <button key={item.title} className={httpStep === index ? styles.httpStepActive : ''} onClick={() => setHttpStep(index)}><span>{index + 1}</span><small>{item.title}</small></button>)}</div>
        <div className={styles.httpWorkbench}><div className={styles.httpActors}><span>CLIENT</span><i /><span>SERVER</span></div><div className={styles.httpDirection}>{currentStep.who}</div><pre>{currentStep.code}</pre><p>{currentStep.note}</p></div>
        <div className={styles.schemeTable}><div className={styles.schemeHead}><span>方案</span><span>凭证形态</span><span>应该理解的边界</span></div><div><strong>Basic</strong><span>Base64(username:password)</span><em>只是编码，必须依赖 TLS</em></div><div><strong>Digest</strong><span>Nonce + 密码摘要</span><em>仍不能可靠抵抗中间人</em></div><div><strong>Bearer</strong><span>持有 Token 即可使用</span><em>泄漏者获得同等权力</em></div><div><strong>扩展方案</strong><span>AWS4-HMAC / Negotiate</span><em>客户端与服务端共同识别</em></div></div>
      </div>
    }
    if (chapter === 3) {
      return <div className={styles.webChapter}>
        <div className={styles.chapterIntro}><span>交互与协议</span><h2>Web 认证不等于一个用户名密码表单</h2><p>表单认证把体验交给应用；WebAuthn 则标准化认证器、挑战和公钥验证，不规定页面长什么样。</p></div>
        <div className={styles.webSwitch}><button className={webMode === 'form' ? styles.webSwitchActive : ''} onClick={() => setWebMode('form')}>Form Authentication</button><button className={webMode === 'webauthn' ? styles.webSwitchActive : ''} onClick={() => setWebMode('webauthn')}>WebAuthn</button></div>
        {webMode === 'form' ? <div className={styles.formModel}><div className={styles.mockLogin}><span>欢迎回来</span><i /><i /><button>登录</button></div><div className={styles.formFreedom}><small>应用可以自由决定</small><div><span>登录方式</span><span>验证码与风控</span><span>表单校验</span><span>品牌与体验</span></div><p>自由度不代表密码传输、权限控制和敏感数据保护也应自行发明。共性安全问题仍应遵循标准。</p></div></div> : <div className={styles.webauthnModel}><div className={styles.ceremony}><span>服务器生成 Challenge</span><i>→</i><span>浏览器调用认证器</span><i>→</i><span>本地验证用户</span><i>→</i><span>私钥签名</span><i>→</i><span>服务端用公钥验证</span></div><div className={styles.keySplit}><div><Icon name="key" /><small>认证器</small><strong>私钥留在设备中</strong></div><b>≠</b><div><Icon name="server" /><small>服务端</small><strong>只保存公钥</strong></div></div><div className={styles.webauthnProperties}><span>一次性 Challenge 防重放</span><span>RP ID 绑定网站</span><span>生物特征只在本地解锁</span></div></div>}
        <div className={styles.webInsight}><strong>二者并非简单的新旧替代：</strong><p>Form 描述应用层登录交互；WebAuthn 描述公钥凭证的注册与认证仪式。一个产品可以拥有自定义页面，同时使用 WebAuthn/Passkey 完成认证。</p></div>
      </div>
    }
    if (chapter === 4) {
      return <div className={styles.implementationChapter}>
        <div className={styles.chapterIntro}><span>工程落地</span><h2>协议验证之后，身份如何进入业务代码</h2><p>成熟框架把认证机制、主体表示、安全上下文和授权接口分离，业务不应到处重复解析凭证。</p></div>
        <div className={styles.securityPipeline}><div><span><Icon name="gateway" /></span><small>认证输入</small><strong>HTTP / Form / Token</strong></div><i>→</i><div><span><Icon name="shield" /></span><small>安全框架</small><strong>验证并建立 Subject</strong></div><i>→</i><div><span><Icon name="user" /></span><small>Principal</small><strong>当前主体是谁</strong></div><i>→</i><div><span><Icon name="lock" /></span><small>Security Context</small><strong>在调用链中传递</strong></div></div>
        <div className={styles.jaasModel}><div><small>JAAS 留下的概念语言</small><h3>LoginModule → LoginContext → Subject</h3><p>Principal 表示身份，Credentials 表示证明材料；现代框架名称可能不同，但边界仍然活跃。</p></div><div className={styles.contextCode}><span>业务代码看到什么？</span><code>currentUser.getPrincipal()</code><code>currentUser.isInRole("admin")</code></div></div>
        <div className={styles.frameworkDuties}><div><span>01</span><strong>认证功能</strong><p>支持 HTTP、表单、令牌等机制。</p></div><div><span>02</span><strong>安全上下文</strong><p>向应用暴露当前主体与认证状态。</p></div><div><span>03</span><strong>授权接口</strong><p>把资源许可判断集中到明确位置。</p></div><div><span>04</span><strong>密码验证</strong><p>使用专用哈希和成熟组件处理秘密。</p></div></div>
        <div className={styles.frameworkChoice}><span>Apache Shiro</span><b>便捷、轻量</b><i>或</i><span>Spring Security</span><b>能力完整、生态集成</b><p>选择框架不是关键终点；关键是使用成熟组件并保持认证、上下文、授权和密码处理的职责边界。</p></div>
      </div>
    }
    const topic = modernTopics[modernTopic]
    return <div className={styles.modernChapter}>
      <div className={styles.chapterIntro}><span>现代实践</span><h2>认证是一条身份生命周期，不是一次登录</h2><p>沿着账号从建立到恢复的路径，检查每次状态变化是否留下另一条仍然有效的旧入口。</p></div>
      <div className={styles.identityTimeline}>{Object.entries(modernTopics).map(([id, value], index) => <button key={id} className={modernTopic === id ? styles.modernActive : ''} onClick={() => setModernTopic(id)}><span>{index + 1}</span><small>{value.tag}</small><strong>{value.title}</strong></button>)}</div>
      <div className={styles.modernDetail}><div><small>{topic.tag}</small><h3>{topic.title}</h3><p>{topic.body}</p></div><div><span>架构决策</span><p>{topic.decision}</p></div></div>
      <div className={styles.modernMetrics}><div><small>不要只问</small><strong>“是否开启 MFA？”</strong></div><i>→</i><div><small>更应该问</small><strong>使用了哪类认证器？如何恢复？多久撤销？</strong></div></div>
      <div className={styles.modernActions}><button onClick={() => setShowTheater(true)}><Icon name="play" />打开“实时钓鱼与 Passkey”原理剧场</button><button onClick={onEnterLab}>进入综合攻击实验 <span>→</span></button></div>
    </div>
  }

  return <div className={styles.authCourse}>
    <aside className={styles.courseRail}>
      <div className={styles.courseRailHead}><small>AUTHENTICATION</small><strong>认证完整课程</strong><span>6 章 · 约 45 分钟</span></div>
      {courseChapters.map((item, index) => <button key={item[0]} className={chapter === index ? styles.courseChapterActive : ''} onClick={() => setChapter(index)}><span>{item[0]}</span><div><strong>{item[1]}</strong><small>{item[2]}</small></div>{index < chapter && <b><Icon name="check" /></b>}</button>)}
      <div className={styles.courseRailProgress}><div><span style={{ width: `${((chapter + 1) / courseChapters.length) * 100}%` }} /></div><small>当前进度 {chapter + 1} / {courseChapters.length}</small></div>
    </aside>
    <section className={styles.courseCanvas}>{renderChapter()}<ChapterGuide key={chapter} guide={chapterGuides[chapter]} /><div className={styles.chapterFooter}><button disabled={chapter === 0} onClick={() => setChapter((value) => Math.max(0, value - 1))}>← 上一章</button><span>{courseChapters[chapter][0]} / 06</span>{chapter < 5 ? <button onClick={() => setChapter((value) => Math.min(5, value + 1))}>下一章 →</button> : <button onClick={onEnterLab}>进入实验 →</button>}</div></section>
  </div>
}

export function HomePage() {
  const [lessonId, setLessonId] = useState<LessonId>('authentication')
  const [mode, setMode] = useState<'theory' | 'lab'>('theory')
  const [selected, setSelected] = useState('')
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [step, setStep] = useState(0)
  const lesson = lessons[lessonId]
  const control = useMemo(() => lesson.controls.find((item) => item.id === selected), [lesson, selected])
  const success = Boolean(control?.correct)

  useEffect(() => {
    if (phase !== 'running') return
    if (step >= lesson.nodes.length - (success ? 1 : 0)) {
      const done = window.setTimeout(() => setPhase('done'), 450)
      return () => window.clearTimeout(done)
    }
    const timer = window.setTimeout(() => setStep((value) => value + 1), 620)
    return () => window.clearTimeout(timer)
  }, [phase, step, lesson.nodes.length, success])

  const changeLesson = (id: LessonId) => {
    setLessonId(id)
    setMode(id === 'authentication' ? 'theory' : 'lab')
    setSelected('')
    setPhase('idle')
    setStep(0)
  }

  const runAttack = () => {
    if (!selected) return
    setStep(0)
    setPhase('running')
  }

  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}><span className={styles.brandMark}><Icon name="shield" /></span><span>架构守门人</span></div>
        <nav className={styles.primaryNav} aria-label="产品导航">
          <button><Icon name="grid" />能力地图</button>
          <button className={styles.navActive}><Icon name="book" />训练任务</button>
        </nav>
        <div className={styles.courseLabel}>第二幕 · 守住访问</div>
        <div className={styles.lessonNav}>
          <button className={lessonId === 'authentication' ? styles.lessonActive : ''} onClick={() => changeLesson('authentication')}><span>01</span><div><small>任务</small><strong>证明你是谁</strong></div></button>
          <button className={lessonId === 'authorization' ? styles.lessonActive : ''} onClick={() => changeLesson('authorization')}><span>02</span><div><small>任务</small><strong>认证不等于授权</strong></div></button>
          <button className={lessonId === 'credential' ? styles.lessonActive : ''} onClick={() => changeLesson('credential')}><span>03</span><div><small>任务</small><strong>被盗凭证如何失效</strong></div></button>
          <button className={styles.lessonLocked}><span>04</span><div><small>稍后开放</small><strong>秘密与密钥</strong></div></button>
        </div>
        <div className={styles.progressCard}>
          <div><span>本幕进度</span><strong>1 / 4</strong></div>
          <div className={styles.progress}><i /></div>
          <small>完成当前任务以继续</small>
        </div>
        <div className={styles.profile}><span>林</span><div><strong>林同学</strong><small>架构学习者</small></div><b>···</b></div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div><span>安全架构训练场</span><b>/</b><strong>第二幕</strong></div>
          <div className={styles.topActions}><button>学习笔记</button><button className={styles.exitButton}>退出训练</button></div>
        </header>

        <section className={styles.content}>
          <div className={styles.lessonHeader}>
            <div><span className={styles.eyebrow}>{lesson.eyebrow}</span><h1>{lesson.title}</h1><p>{lesson.summary}</p></div>
            <div className={styles.score}><small>任务完成度</small><strong>{phase === 'done' && success ? '100' : selected ? '65' : '30'}<em>%</em></strong></div>
          </div>

          {lessonId === 'authentication' && <div className={styles.learningPath}>
            <button className={mode === 'theory' ? styles.learningActive : ''} onClick={() => setMode('theory')}><span>1</span><div><small>概念、协议与身份生命周期</small><strong>系统学习认证</strong></div></button>
            <i>→</i>
            <button className={mode === 'lab' ? styles.learningActive : ''} onClick={() => setMode('lab')}><span>2</span><div><small>再验证你的判断</small><strong>进入攻击实验台</strong></div></button>
          </div>}

          {lessonId === 'authentication' && mode === 'theory' ? <AuthenticationCourse onEnterLab={() => setMode('lab')} /> : <div className={styles.workspace}>
            <section className={styles.labCard}>
              <div className={styles.cardHead}><div><span className={styles.liveDot} />架构实验台</div><span>场景：多租户订单系统</span></div>
              <div className={styles.taskBanner}><Icon name="shield" /><div><small>你的任务</small><strong>{lesson.task}</strong></div></div>

              <div className={styles.architecture}>
                <div className={styles.boundaryLabel}>不可信客户端</div>
                <div className={styles.trustLabel}>服务端信任域</div>
                <div className={styles.nodeRow}>
                  {lesson.nodes.map((node, index) => (
                    <div className={styles.nodeWrap} key={node.title}>
                      <div className={`${styles.node} ${node.tone ? styles[node.tone] : ''} ${phase !== 'idle' && index <= step ? styles.nodeVisited : ''} ${phase === 'done' && success && index === lesson.nodes.length - 2 ? styles.nodeBlocked : ''}`}>
                        <span><Icon name={node.icon} /></span><strong>{node.title}</strong><small>{node.sub}</small>
                      </div>
                      {index < lesson.nodes.length - 1 && <div className={`${styles.arrow} ${phase !== 'idle' && index < step ? styles.arrowHot : ''}`}><i /><b>›</b></div>}
                    </div>
                  ))}
                </div>
                <div className={styles.attackLine}><span>攻击动作</span><code>{lesson.attack}</code></div>
              </div>

              <div className={styles.controlArea}>
                <div className={styles.sectionTitle}><div><span>2</span><strong>选择一个安全控制</strong></div><small>选择后运行攻击，看看它能否真正阻断路径</small></div>
                <div className={styles.controlGrid}>
                  {lesson.controls.map((item) => (
                    <button key={item.id} className={selected === item.id ? styles.controlSelected : ''} onClick={() => { setSelected(item.id); setPhase('idle'); setStep(0) }}>
                      <span><Icon name={item.icon} /></span><div><strong>{item.title}</strong><small>{item.meta}</small></div><i />
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.simulator}>
                <div><span className={styles.attackIcon}>↗</span><div><small>攻击模拟器</small><strong>{selected ? `已装配：${control?.title}` : '请先选择一个控制'}</strong></div></div>
                <button disabled={!selected || phase === 'running'} onClick={runAttack}><Icon name="play" />{phase === 'running' ? '攻击进行中…' : '运行攻击'}</button>
              </div>
            </section>

            <aside className={styles.mentor}>
              <div className={styles.mentorHead}><span>安</span><div><strong>安全导师</strong><small><i />正在观察你的方案</small></div></div>
              <div className={styles.chat}>
                <div className={styles.message}><p>{lesson.question}</p></div>
                <div className={styles.hint}><span>思考提示</span><p>{lessonId === 'authentication' ? '多因素能抵抗凭证泄漏，但能够被用户读出并转交的凭证仍可能被实时钓鱼。' : lessonId === 'authorization' ? '身份是主体的属性，权限是主体与资源之间的关系。' : '凭证状态可能在到期之前就发生变化。'}</p></div>
                {phase === 'done' && (
                  <div className={success ? styles.resultGood : styles.resultBad}>
                    <span><Icon name={success ? 'check' : 'shield'} />{success ? '攻击已阻断' : '攻击仍然成功'}</span>
                    <p>{success ? lesson.success : lesson.failure}</p>
                  </div>
                )}
              </div>
              <div className={styles.mentorActions}><button onClick={() => setSelected(lesson.controls.find((item) => item.correct)?.id ?? '')}>给我一个提示</button><button>查看知识卡</button></div>
            </aside>
          </div>}
        </section>
      </main>
    </div>
  )
}
