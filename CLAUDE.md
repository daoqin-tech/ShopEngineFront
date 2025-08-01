# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production (TypeScript compilation + Vite build)  
- `npm run lint` - Run ESLint with TypeScript support
- `npm run preview` - Preview production build locally

## Architecture Overview

This is a modern React 19 + TypeScript + Vite project using shadcn/ui components and Tailwind CSS v4, focused on AI image generation for e-commerce. The application follows these architectural patterns:

### Core Stack
- **React 19.1.0** with concurrent features and modern patterns
- **TypeScript 5.8.3** with strict compiler settings and ES2020+ target
- **Vite 7.0.4** for build tooling and development server
- **Tailwind CSS 4.1.11** (latest v4) with CSS variables and dark mode support
- **React Router DOM 7.7.1** for client-side routing

### Application Structure
This is an AI image generation platform with the following main features:
- **AI Image Projects** - Managing AI image generation projects
- **AI Image Generator** - Two-step workflow for prompt generation and image creation
- **Image Editor** - Tools for optimizing generated images
- **Sidebar Navigation** - Collapsible navigation with user/team switching

### Project Structure
- `src/components/ui/` - shadcn/ui components (Avatar, Breadcrumb, Button, Dropdown, Input, Separator, Sheet, Sidebar, Skeleton, Tooltip)
- `src/components/` - Application-specific components (app-sidebar, nav-main, nav-projects, nav-user, team-switcher)
- `src/pages/` - Main application pages
  - `AIImageGenerator/` - Multi-step AI image generation workflow
  - `AIImageProjects.tsx` - Project management interface  
  - `ImageEditor.tsx` - Image optimization tools
- `src/hooks/` - Custom React hooks (use-mobile.ts for responsive detection)
- `src/lib/` - Utility functions (utils.ts for className merging)
- `@/` alias maps to `./src/` for clean imports

### UI Framework Setup
- **shadcn/ui** configured with "new-york" style variant in `components.json`
- **Radix UI primitives** for accessible component foundation
- **class-variance-authority (CVA)** for type-safe component variants
- **Lucide React** for icons
- **tailwind-merge + clsx** for utility class management
- **Axios 1.11.0** for HTTP requests

### TypeScript Configuration
Uses project references pattern:
- `tsconfig.json` - Root config with references and path mapping
- `tsconfig.app.json` - App-specific config with React JSX and strict mode
- `tsconfig.node.json` - Build tools config

Key compiler options: bundler module resolution, `"jsx": "react-jsx"`, strict typing, path mapping for `@/*` imports.

### Styling System
- Tailwind CSS v4 with CSS custom properties for theming
- Dark mode support via `.dark` class
- Design tokens using CSS variables defined in `src/index.css`
- Component variants managed through CVA
- Animation support via tailwindcss-animate

### ESLint Configuration
Uses modern flat config format (`eslint.config.js`) with:
- TypeScript ESLint for type-aware linting
- React Hooks plugin for hook usage rules
- React Refresh plugin for Vite integration
- Ignores `dist` directory

### Routing Structure
The application uses React Router with the following main routes:
- `/` - Home/AI Image Projects
- `/materials` - Materials dashboard
- `/materials/product-images` - AI Image Projects listing
- `/materials/project/:projectId/edit` - AI Image Generator workflow
- `/materials/image-editor` - Image Editor tools

### Key Components
- **AIImageGenerator** - Multi-step workflow with prompt generation and image creation
- **AppSidebar** - Main navigation with collapsible design
- **StepIndicator** - Progress tracking for multi-step workflows
- Custom breadcrumb navigation integrated with routing