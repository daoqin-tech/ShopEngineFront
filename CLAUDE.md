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
This is an AI-powered e-commerce tool platform with multiple features:
- **AI Image Projects** - Managing AI image generation projects
- **AI Image Generator** - Two-step workflow for prompt generation and image creation
- **Image Editor** - Tools for optimizing and editing generated images
- **OCR Recognition** - Text recognition from images with editing capabilities
- **Authentication System** - WeChat-based login and user management
- **Sidebar Navigation** - Collapsible navigation with user/team switching

### Project Structure
- `src/components/ui/` - shadcn/ui components (Avatar, Badge, Breadcrumb, Button, Card, Dialog, Dropdown, Input, Label, Separator, Sheet, Sidebar, Skeleton, Slider, Tabs, Textarea, Tooltip)
- `src/components/` - Application-specific components (app-sidebar, nav-main, nav-projects, nav-user, team-switcher, ProtectedRoute, WorkspaceLayout)
- `src/pages/` - Main application pages
  - `AIImageGenerator/` - Multi-step AI image generation workflow
  - `AIImageProjects.tsx` - Project management interface
  - `ImageEdit/` - Image editing tools and components
  - `Ocr/` - OCR recognition with upload and history modes
  - `Login.tsx` - Authentication page
  - `WechatCallback.tsx` - WeChat OAuth callback handler
- `src/contexts/` - React contexts (AuthContext.tsx for user authentication)
- `src/hooks/` - Custom React hooks (use-mobile.ts for responsive detection)
- `src/lib/` - Utility functions and API clients (utils.ts, api.ts, tencentCloud.ts)
- `src/services/` - API service layers for all features
- `src/types/` - TypeScript type definitions (imageEdit.ts, ocr.ts)
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
- `/materials/ocr` - OCR Recognition projects
- `/materials/ocr/:projectId/edit` - OCR Editor workflow
- `/materials/image-edit` - Image Edit projects
- `/login` - Authentication page
- `/wechat/callback` - WeChat OAuth callback

### Key Components
- **AIImageGenerator** - Multi-step workflow with prompt generation and image creation
- **TemplateEditor** - PSD template preview and configuration system
- **ImageEditor** - Tools for image optimization and editing
- **OcrEditor** - OCR text recognition with upload and history modes
- **AuthContext** - React context for user authentication and state management
- **ProtectedRoute** - Route wrapper for authentication-required pages
- **AppSidebar** - Main navigation with collapsible design
- **StepIndicator** - Progress tracking for multi-step workflows
- Custom breadcrumb navigation integrated with routing

### AI Image Generation Workflow
The core feature is a two-step AI image generation process:

1. **Prompt Generation Step** (`src/pages/AIImageGenerator/PromptGenerationStep.tsx`)
   - Chat-based interface for generating and optimizing prompts
   - Prompt selection and management using Map-based state
   - Integration with AI conversation sessions

2. **Image Generation Step** (`src/pages/AIImageGenerator/ImageGenerationStep.tsx`)
   - Batch image generation from selected prompts
   - Real-time status tracking and progress updates
   - Support for multiple aspect ratios (1:1, 16:9, 9:16, 21:9, 4:3, 3:2)
   - Export capabilities (individual images, ZIP archives, PDF documents)

### Template Editor System
The Template Editor (`src/pages/TemplateEditor.tsx`) provides a comprehensive PSD template preview and configuration interface:

1. **Template Preview Mode**
   - Read-only preview of PSD templates with layer visualization
   - Canvas zoom (25%-500%) with pan controls and smooth positioning
   - Layer highlighting system for overlapping layer identification
   - Real-time canvas positioning and smooth scrolling to selected layers

2. **Slice Region Management** (`src/pages/template/`)
   - Interactive slice region creation with `AddSliceDialog`
   - Visual slice overlays with numbered regions and size indicators
   - Drag-to-create slice regions with automatic indexing
   - Backend synchronization via `templateService.updateSlicing()`
   - Uses `uuid` library for consistent ID generation

3. **Layer Management System**
   - Smart layer selection with automatic viewport centering
   - Layer panel (`LayersPanel`) with replacement layer marking
   - Replaceable layer checkbox system for smart objects
   - Layer highlighting with visual effects (glow + pulse animation)
   - Keyboard shortcuts (ESC to deselect, zoom controls)

4. **Key Template Editor Components**
   - `LayerComponent` - Individual layer rendering with zoom scaling
   - `SliceRegionsOverlay` - Visual slice region display with responsive scaling
   - `LayersPanel` - Layer list with replacement selection interface
   - `SlicePanel` - Slice region management and deletion controls

### State Management Patterns
- **Authentication State** - React Context pattern with `AuthContext` for user management
- **Extended Session Model** - `ExtendedAIImageSession` with Map-based collections for prompts and images
- **Centralized Types** - Type definitions organized by feature in `src/types/` and component-specific types
- **Service Layer** - Separated API interactions for each major feature
- **Real-time Polling** - Task polling service (`taskPollingService.ts`) for async operations
- **Local Storage** - Token-based authentication persistence

### Key Libraries
- **jspdf** - PDF generation for image exports
- **jszip** - Archive creation for batch downloads
- **sonner** - Toast notifications
- **react-markdown** - Markdown rendering for AI responses
- **axios** - HTTP client for API requests
- **uuid** - UUID generation for slice regions and template management

### Authentication System
- **WeChat OAuth** integration for user authentication
- **Token-based** authentication with localStorage persistence
- **Protected routes** using `ProtectedRoute` component wrapper
- **AuthContext** provides user state and authentication methods across the app

### API Integration
- **Centralized API client** in `src/lib/api.ts` with axios interceptors
- **Tencent Cloud** integration for cloud services
- **Service layer pattern** - separate service files for each feature area
- **Task polling** system for async operations (image generation, OCR processing)
- **Template Management APIs** - `templateService` with specialized endpoints:
  - `updateSlicing()` - Slice region management with complete region arrays
  - `updateReplacementLayers()` - Replaceable layer ID management
  - `getTemplate()` - Template data loading with layers and metadata

### Development Notes
- 你不用测试,我会测试,也不用帮我运行项目 (User handles testing and running the project)
- Use existing component patterns and follow the established architecture
- Maintain type safety with comprehensive TypeScript definitions
- Follow the service layer pattern for new API integrations

### Template Editor Architecture Notes
- **Pure Preview Mode** - Templates are read-only; only slice regions and layer replacement selections are editable
- **Local State Management** - Uses `useState` instead of complex hooks for template data
- **API-First Updates** - All changes call backend APIs before updating UI state (no optimistic updates)
- **Layer Management** - `Template.layerIds[]` stores user-selected replacement layer IDs
- **Slice Management** - `Template.slicing.regions[]` contains complete SliceRegion objects with UUIDs
- **Visual Feedback** - Layer highlighting system for multi-layer overlap scenarios