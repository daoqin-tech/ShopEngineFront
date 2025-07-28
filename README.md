# ShopEngineFront

基于 React 19 + TypeScript + Vite 构建的现代化电商前端项目，使用 shadcn/ui 组件库和 Tailwind CSS v4。

## 技术栈

- **React 19.1.0** - 最新版本的 React，支持并发特性
- **TypeScript 5.8.3** - 类型安全的开发体验
- **Vite 7.0.4** - 快速的构建工具和开发服务器
- **Tailwind CSS 4.1.11** - 原子化 CSS 框架
- **shadcn/ui** - 现代化的 React 组件库
- **Radix UI** - 无障碍的底层组件原语

## 快速开始

### 环境要求

- Node.js 18+ 
- npm 或 yarn 或 pnpm

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

项目将在 `http://localhost:5173` 启动，支持热更新。

### 构建项目

```bash
npm run build
```

构建产物将输出到 `dist` 目录。

### 预览构建结果

```bash
npm run preview
```

### 代码检查

```bash
npm run lint
```

## 项目结构

```
src/
├── components/
│   └── ui/          # shadcn/ui 组件
├── lib/             # 工具函数
├── assets/          # 静态资源
├── App.tsx          # 主应用组件
├── main.tsx         # 应用入口
└── index.css        # 全局样式
```

## 开发说明

- 使用 `@/` 别名引用 `src` 目录下的文件
- 支持暗色模式，通过 `.dark` 类切换
- 组件样式使用 Tailwind CSS 和 CSS 变量
- 严格的 TypeScript 配置确保代码质量
