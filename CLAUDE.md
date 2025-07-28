# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production (TypeScript compilation + Vite build)  
- `npm run lint` - Run ESLint with TypeScript support
- `npm run preview` - Preview production build locally

## Architecture Overview

This is a modern React 19 + TypeScript + Vite project using shadcn/ui components and Tailwind CSS v4. The architecture follows these patterns:

### Core Stack
- **React 19.1.0** with concurrent features and modern patterns
- **TypeScript 5.8.3** with strict compiler settings and ES2020+ target
- **Vite 7.0.4** for build tooling and development server
- **Tailwind CSS 4.1.11** (latest v4) with CSS variables and dark mode support

### Project Structure
- `src/components/ui/` - shadcn/ui components (currently has Button)
- `src/lib/` - Utility functions (utils.ts for className merging)
- `src/assets/` - Static assets
- `@/` alias maps to `./src/` for clean imports

### UI Framework Setup
- **shadcn/ui** configured with "new-york" style variant in `components.json`
- **Radix UI primitives** for accessible component foundation
- **class-variance-authority (CVA)** for type-safe component variants
- **Lucide React** for icons
- **tailwind-merge + clsx** for utility class management

### TypeScript Configuration
Uses project references pattern:
- `tsconfig.json` - Root config with references
- `tsconfig.app.json` - App-specific config with React JSX and strict mode
- `tsconfig.node.json` - Build tools config

Key compiler options: bundler module resolution, `"jsx": "react-jsx"`, path mapping for `@/*` imports.

### Styling System
- Tailwind CSS v4 with CSS custom properties for theming
- Dark mode support via `.dark` class
- Design tokens using CSS variables defined in `src/index.css`
- Component variants managed through CVA

### ESLint Configuration
Uses modern flat config format with TypeScript ESLint, React Hooks, and React Refresh plugins.

## Development Notes

The project is in early development with minimal boilerplate. Key areas ready for expansion:
- No routing system (React Router would be appropriate)
- No state management beyond React's built-in state
- No API integration or data fetching setup
- No testing framework configured
- Only Button component from shadcn/ui is currently implemented

When adding new shadcn/ui components, use the CLI or follow the existing Button pattern in `src/components/ui/button.tsx`.