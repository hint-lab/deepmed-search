# DeepMed Search

[English](#english) | [中文](#中文)

<a name="english"></a>
# DeepMed Search

An intelligent document search and management system built with Next.js 14 and shadcn/ui.

## Tech Stack

### Core Framework
- [Next.js 14](https://nextjs.org/) - React Framework
- [React 19](https://react.dev/) - UI Library
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript

### Database
- [Prisma](https://www.prisma.io/) - Next Generation ORM
- [PostgreSQL](https://www.postgresql.org/) - Relational Database

### UI/Styling
- [shadcn/ui](https://ui.shadcn.com/) - High-quality UI Component Library
- [Radix UI](https://www.radix-ui.com/) - Unstyled Component Library
- [Tailwind CSS](https://tailwindcss.com/) - CSS Framework
- [Lucide Icons](https://lucide.dev/) - Icon Library

### State Management & Data Fetching
- [React Query](https://tanstack.com/query/latest) - Server State Management
- [React Hook Form](https://react-hook-form.com/) - Form Management
- [Zod](https://zod.dev/) - Type Validation

### Feature Components
- [react-pdf-highlighter](https://github.com/agentcooper/react-pdf-highlighter) - PDF Highlighting
- [react-dropzone](https://react-dropzone.js.org/) - File Drag & Drop
- [react-markdown](https://remarkjs.github.io/react-markdown/) - Markdown Rendering

### Development Tools
- [ESLint](https://eslint.org/) - Code Linting
- [Prettier](https://prettier.io/) - Code Formatting
- [Husky](https://typicode.github.io/husky/) - Git Hooks

## Getting Started

1. Clone the project and install dependencies:

```bash
git clone <repository-url>
cd deepmed-search
pnpm install
```

2. Configure environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` file with necessary environment variables:

```env
# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/deepmed"

# Next Auth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Other configurations...
```

3. Initialize the database:

```bash
pnpm db:generate  # Generate Prisma Client
pnpm db:migrate   # Run database migrations
```

4. Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

## Project Structure

```
.
├── src/                    # Source Code
│   ├── app/               # Next.js App Router Routes
│   ├── components/        # React Components
│   │   ├── ui/           # shadcn/ui Components
│   │   └── ...           # Custom Components
│   ├── hooks/            # React Hooks
│   ├── lib/              # Utility Functions
│   ├── types/            # TypeScript Types
│   └── i18n/             # Internationalization
├── prisma/               # Prisma Configuration & Migrations
├── public/              # Static Assets
└── scripts/             # Utility Scripts
```

## Available Scripts

```bash
# Development
pnpm dev         # Start development server
pnpm lint        # Run code linting

# Database
pnpm db:generate # Generate Prisma Client
pnpm db:migrate  # Run database migrations
pnpm db:reset    # Reset database
pnpm db:studio   # Start Prisma Studio

# Build & Deploy
pnpm build       # Build for production
pnpm start       # Start production server
```

## UI Components

This project uses [shadcn/ui](https://ui.shadcn.com/) as the UI component library. It's a high-quality collection of components built on top of Radix UI and Tailwind CSS.

### Adding New Components

Use the shadcn-ui CLI to add components:

```bash
pnpm dlx shadcn-ui@latest add button
```

All components will be added to the `src/components/ui` directory, where you can customize them as needed.

### Theme Customization

Theme configuration files are located at:
- `app/globals.css` - Global styles
- `components/ui/themes.ts` - Theme configuration
- `tailwind.config.js` - Tailwind configuration

## Internationalization

The project uses i18next for internationalization, supporting English, Chinese, and Japanese:

```typescript
// Language switching
const { changeLanguage } = useLanguageSwitcher();
changeLanguage('en'); // Switch to English
```

Translation files are located in the `src/i18n/locales/` directory.

## Test Account

Create a test account:

```bash
npx tsx src/scripts/create-test-user.ts
```

## Deployment

The project can be deployed to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/deepmed-search)

For more deployment details, refer to the [Next.js Deployment Documentation](https://nextjs.org/docs/app/building-your-application/deploying).

## Contributing

Pull requests and issues are welcome! Before submitting, please ensure:

1. Code passes ESLint checks (`pnpm lint`)
2. Commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) specification
3. Documentation is updated accordingly

## License

MIT

---

<a name="中文"></a>
# DeepMed Search

这是一个基于 Next.js 14 和 shadcn/ui 构建的智能文档搜索和管理系统。

## 技术栈

### 核心框架
- [Next.js 14](https://nextjs.org/) - React 框架
- [React 19](https://react.dev/) - 用户界面库
- [TypeScript](https://www.typescriptlang.org/) - 类型安全的 JavaScript

### 数据库
- [Prisma](https://www.prisma.io/) - 下一代 ORM
- [PostgreSQL](https://www.postgresql.org/) - 关系型数据库

### UI/样式
- [shadcn/ui](https://ui.shadcn.com/) - 高质量 UI 组件库
- [Radix UI](https://www.radix-ui.com/) - 无样式组件库
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [Lucide Icons](https://lucide.dev/) - 图标库

### 状态管理与数据获取
- [React Query](https://tanstack.com/query/latest) - 服务端状态管理
- [React Hook Form](https://react-hook-form.com/) - 表单管理
- [Zod](https://zod.dev/) - 类型验证

### 功能组件
- [react-pdf-highlighter](https://github.com/agentcooper/react-pdf-highlighter) - PDF 高亮功能
- [react-dropzone](https://react-dropzone.js.org/) - 文件拖拽上传
- [react-markdown](https://remarkjs.github.io/react-markdown/) - Markdown 渲染

### 开发工具
- [ESLint](https://eslint.org/) - 代码检查
- [Prettier](https://prettier.io/) - 代码格式化
- [Husky](https://typicode.github.io/husky/) - Git Hooks

## 开始使用

1. 克隆项目并安装依赖：

```bash
git clone <repository-url>
cd deepmed-search
pnpm install
```

2. 配置环境变量：

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，填写必要的环境变量：

```env
# 数据库配置
DATABASE_URL="postgresql://user:password@localhost:5432/deepmed"

# Next Auth 配置
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# 其他配置...
```

3. 初始化数据库：

```bash
pnpm db:generate  # 生成 Prisma Client
pnpm db:migrate   # 运行数据库迁移
```

4. 运行开发服务器：

```bash
pnpm dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看结果。

## 项目结构

```
.
├── src/                    # 源代码目录
│   ├── app/               # Next.js App Router 路由
│   ├── components/        # React 组件
│   │   ├── ui/           # shadcn/ui 组件
│   │   └── ...           # 自定义组件
│   ├── hooks/            # React Hooks
│   ├── lib/              # 工具函数
│   ├── types/            # TypeScript 类型定义
│   └── i18n/             # 国际化文件
├── prisma/               # Prisma 配置和迁移
├── public/              # 静态资源
└── scripts/             # 工具脚本
```

## 可用脚本

```bash
# 开发
pnpm dev         # 启动开发服务器
pnpm lint        # 运行代码检查

# 数据库
pnpm db:generate # 生成 Prisma Client
pnpm db:migrate  # 运行数据库迁移
pnpm db:reset    # 重置数据库
pnpm db:studio   # 启动 Prisma Studio

# 构建和部署
pnpm build       # 构建生产版本
pnpm start       # 启动生产服务器
```

## UI 组件

本项目使用 [shadcn/ui](https://ui.shadcn.com/) 作为 UI 组件库。这是一个基于 Radix UI 和 Tailwind CSS 构建的高质量组件集合。

### 添加新组件

使用 shadcn-ui CLI 添加组件：

```bash
pnpm dlx shadcn-ui@latest add button
```

所有组件都会被添加到 `src/components/ui` 目录下，你可以根据需要自定义这些组件。

### 主题定制

主题配置文件位于：
- `app/globals.css` - 全局样式
- `components/ui/themes.ts` - 主题配置
- `tailwind.config.js` - Tailwind 配置

## 国际化

项目使用 i18next 进行国际化，支持中文、英文和日文：

```typescript
// 切换语言
const { changeLanguage } = useLanguageSwitcher();
changeLanguage('zh'); // 切换到中文
```

翻译文件位于 `src/i18n/locales/` 目录下。

## 测试账号

创建测试账号：

```bash
npx tsx src/scripts/create-test-user.ts
```

## 部署

项目可以部署到 Vercel 平台：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/deepmed-search)

更多部署细节请参考 [Next.js 部署文档](https://nextjs.org/docs/app/building-your-application/deploying)。

## 贡献

欢迎提交 Pull Request 和 Issue！在提交之前，请确保：

1. 代码通过 ESLint 检查 (`pnpm lint`)
2. 提交信息遵循 [约定式提交](https://www.conventionalcommits.org/zh-hans/) 规范
3. 更新相关文档

## 许可证

MIT