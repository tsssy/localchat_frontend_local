# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based chat application (陪聊软件应用) built with TypeScript, Vite, and Tailwind CSS. The app is a social platform for matching and chatting with profiles, featuring a mobile-first design with a bottom navigation interface.

## Development Commands

- `npm run dev` - Start development server on port 3000 with ngrok support for Telegram WebApp testing
- `npm run build` - Build production bundle to `build/` directory using Vite
- `npm i` - Install dependencies

**Note**: This project does not have lint, test, or type checking scripts configured in package.json. TypeScript compilation is handled by Vite during development and build.

## Architecture & Key Components

### Main Application Structure
- **App.tsx**: Central state management with complex routing logic for Telegram deep links
- **Main Pages**: NewGirls (matching), Messages (chat list), Shop (purchase), ChatScreen (1:1 chat)
- **Loading Page**: Initialization and Telegram WebApp integration
- **Navigation**: Bottom tab navigation with 3 main sections + modal pages

### State Management Pattern
The app uses React's built-in state management with useState hooks in App.tsx:
- `currentPage`: Controls which page is displayed (loading, newGirls, messages, shop, chat, purchaseHistory)
- `activeTab`: Controls bottom navigation state
- `currentChatGirl`: Manages active chat state with chatroomId-based routing
- `userSession`: Centralized user data from initialization API
- `pageStack`: Navigation history for back button functionality
- `newMessageChatrooms`: Red dot notifications for unread messages

### Component Architecture
- **UI Components**: Located in `src/components/ui/` - comprehensive Radix UI + Tailwind component library
- **Page Components**: Feature pages in `src/components/pages/[page-name]/`
- **Services**: API services in `src/api/http/v1/` and utility services in `src/services/`
- **Utils**: Utilities in `src/utils/` including Telegram WebApp integration and API transformers

### Service Layer Architecture
- **APIServices**: HTTP client with typed endpoints (`src/api/http/v1/APIServices.ts`)
- **PusherService**: Real-time WebSocket integration for live messaging (`src/services/PusherService.ts`)
- **MessageToastService**: Toast notification system for incoming messages
- **UserSession**: Session management utilities

### Design System
- **Styling**: Tailwind CSS v4 with slate color scheme (slate-900 background, white text)
- **Icons**: Lucide React icon library
- **Components**: Radix UI primitives with custom styling
- **Responsive**: Mobile-first design optimized for Telegram WebApp

### Data Flow Patterns
- **Initialization**: Loading page calls `/initialize` API and handles Telegram WebApp setup
- **Caching Strategy**: API responses cached in userSession.meta to reduce subsequent calls
- **Real-time Updates**: Pusher WebSocket integration for live messaging with toast notifications
- **Navigation**: Page stack system for modal-style navigation with proper back button handling

### File Structure Conventions
- Components use PascalCase naming
- UI components in separate `/ui` subdirectory with Radix UI + Tailwind styling
- TypeScript interfaces defined inline within component files
- Absolute imports configured with `@/` alias pointing to `src/`
- Strict TypeScript configuration with noUnusedLocals and noUnusedParameters enabled

### Technology Stack
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite with SWC
- **Styling**: Tailwind CSS v4 with slate color scheme (slate-900 background, white text)
- **UI Library**: Radix UI primitives
- **Icons**: Lucide React
- **Forms**: React Hook Form
- **Themes**: next-themes for dark/light mode support

### Telegram WebApp Integration
- Built specifically for Telegram Mini Apps with WebApp API integration
- Development server configured with ngrok support for testing in Telegram
- Handles Telegram deep links for direct navigation to chat rooms
- Uses Telegram user authentication and initialization data

## API Structure
The codebase has a complete API layer implementation:
- `src/api/http/v1/APIServices.ts` - HTTP client with typed endpoints for all backend communication
- `src/api/http/v1/APISchemes.ts` - TypeScript interfaces for API request/response types
- `src/api/http/http_requester.ts` - Base HTTP client configuration
- Real-time messaging handled via PusherService WebSocket integration