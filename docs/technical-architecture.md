
# Veekay Labs
## Technical Architecture

---

# Purpose

This document defines the technical architecture for Veekay Labs. The platform is designed as an AI-native web application that combines a personal profile, product portfolio, knowledge hub, and AI-powered learning ecosystem. The architecture emphasizes modularity, scalability, maintainability, and AI-first experiences.

---

# Architecture Principles

## AI-Native
AI is a core platform capability, not an add-on. Every major feature should be discoverable through both traditional navigation and conversational AI.

## Modular
Frontend, backend, content, search, AI services, and data layers should be independently deployable where practical.

## Content as Data
Articles, projects, PMOS documentation, PRDs, and Builder's Journal entries should be stored as structured Markdown/MDX with metadata.

## API-First
Expose platform capabilities through internal APIs to support future integrations.

## Cloud Ready
The platform should run locally for development and deploy seamlessly to production.

---

# High-Level Architecture

Visitor
↓
Next.js Frontend
↓
Application Layer
├── Content Engine
├── Search Engine
├── AI Assistant
├── Analytics
└── API Layer
↓
Data Layer
├── MDX Content
├── Supabase
├── Pinecone
└── GitHub

---

# Frontend

Framework
- Next.js (App Router)
- React
- TypeScript

UI
- Tailwind CSS
- shadcn/ui
- Framer Motion

Capabilities
- Server Components
- Client Components
- Responsive layouts
- SEO
- Static generation where appropriate

---

# Content Layer

Primary source: Markdown/MDX.

Content domains:
- Website pages
- Projects
- PMOS
- Articles
- Builder's Journal
- Roadmaps
- Frameworks
- Templates

Metadata should include title, summary, tags, topics, technologies, dates, related content, and AI indexing status.

---

# Backend Services

Supabase
- User data (future)
- Newsletter subscribers
- Feedback
- AI conversation history (future)

API Routes
- Search
- AI chat
- GitHub sync
- Contact form
- Analytics events

---

# AI Architecture

Model Layer
- OpenAI Responses API

Retrieval
- Hybrid keyword + semantic search
- Retrieval-Augmented Generation (RAG)

Vector Store
- Pinecone

Knowledge Sources
- Resume
- Projects
- PRDs
- PMOS
- Articles
- Builder's Journal
- GitHub READMEs
- Architecture documents

Future
- Multi-agent orchestration
- Knowledge graph
- Personalized learning

---

# Search Architecture

Version 1
- Full-text search

Version 2
- Hybrid search

Version 3
- Semantic recommendations

Version 4
- Knowledge graph navigation

---

# GitHub Integration

Integrate with GitHub APIs to surface:
- Repository metadata
- README files
- Recent commits
- Releases
- Languages
- Contribution activity

Future:
- Automatic synchronization of project documentation.

---

# Analytics

Tools
- PostHog
- Google Analytics

Track:
- Page views
- AI Assistant usage
- Search queries
- Project engagement
- Article engagement
- Learning path progress

---

# Deployment

Development
- Local (Node.js)

Production
- Vercel

Future
- Custom domain
- CDN
- Edge functions

---

# Security

- Environment variables for secrets
- Secure API routes
- Rate limiting for AI endpoints
- Input validation
- Content sanitization
- Privacy-first analytics

---

# Scalability Roadmap

Phase 1
- Static website

Phase 2
- Dynamic content

Phase 3
- AI Assistant

Phase 4
- Knowledge graph

Phase 5
- Multi-agent platform

---

# Repository Structure

/src
/components
/app
/content
/projects
/pmos
/lib
/services
/public
/styles
/docs

Separate content from presentation and business logic.

---

# Technical Decision Log

Maintain an Architecture Decision Record (ADR) for major technical decisions including rationale, alternatives considered, trade-offs, and implementation status.

---

# Future Vision

The architecture should support Veekay Labs evolving from a personal website into an AI-native platform where content, projects, learning, and conversational AI are interconnected through a scalable knowledge ecosystem.