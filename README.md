# Security Frontend

基于 Vite、React 和 TypeScript 的可持续迭代前端工程。本仓库不包含后端服务。

## 开发

```bash
npm install
npm run dev
```

## 命令

- `npm run dev`：启动开发服务器
- `npm run build`：类型检查并构建生产版本
- `npm run lint`：代码质量检查
- `npm run preview`：预览生产构建

## 目录

```text
src/
├── app/          # 应用入口、路由、全局 Provider
├── assets/       # 图片、字体等静态资源
├── components/   # 跨业务复用组件
├── features/     # 按业务领域组织的功能模块
├── hooks/        # 通用 React Hooks
├── lib/          # 第三方库封装和工具
├── pages/        # 路由页面
├── services/     # 远程接口访问层
├── styles/       # 全局样式与设计变量
└── types/        # 全局共享类型
```

## 当前工作边界

本项目当前以“在线图书”为唯一工作重心。在线图书由根目录的 `src/`、`book/` 和 `public/` 共同组成，使用根目录的 Vite 命令开发、构建和预览。

此前规划的交互式安全架构教学网站已暂时封存，相关设计资料、旧正文和资源统一放在 [`archive/interactive-website/`](archive/interactive-website/) 中。该目录不参与当前 Vite 构建，也不作为在线图书的内容来源；恢复或重新开发交互式网站时，应在该目录建立独立的工程和依赖边界。
