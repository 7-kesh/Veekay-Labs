

# Veekay Labs
## Information Architecture

---

# Purpose

This document defines the structure, navigation, and user journeys for Veekay Labs. The goal is to create an intuitive AI-native platform that allows visitors to discover who I am, explore what I build, learn from my experience, and interact with an AI assistant.

---

# Design Philosophy

The information architecture follows three principles:

1. Progressive Disclosure — show only what is needed, reveal deeper content on demand.
2. Audience First — optimize navigation for recruiters, hiring managers, PMs, engineers, and learners.
3. AI-Native — the AI Assistant is available across the platform as an alternative way to explore content.

---

# Primary Navigation

- Home
- About
- Build
- Writing
- Learn
- Ask AI
- Now
- Resume
- Contact

---

# Sitemap

Home
├── About
├── Build
│   ├── Products
│   ├── Case Studies
│   ├── Demo Videos
│   ├── GitHub
│   └── Architecture Gallery
├── Writing
│   ├── Medium
│   ├── Substack
│   ├── LinkedIn
│   └── Builder's Journal
├── Learn
│   ├── PMOS
│   ├── Product Management
│   ├── AI Product Management
│   ├── Frameworks
│   ├── Templates
│   ├── Interview Prep
│   └── Learning Paths
├── Ask AI
├── Now
├── Resume
└── Contact

---

# Homepage Structure

1. Hero
2. Impact Metrics
3. Featured Products
4. Latest Writing
5. Now Building
6. AI Assistant Preview
7. Knowledge Hub Preview
8. Footer

The homepage should introduce the platform, not explain everything.

---

# User Journeys

## Recruiter
Home → About → Resume → Build → Contact

Goal: Quickly understand experience, business impact, and projects.

## Hiring Manager
Home → Build → Case Study → Demo → Resume → Contact

Goal: Evaluate product thinking and execution.

## Product Manager
Home → Writing → Learn → PMOS → Ask AI

Goal: Learn frameworks and product practices.

## AI Engineer
Home → Build → Architecture → GitHub → Ask AI

Goal: Explore technical depth and implementation.

## Student
Home → Learn → Learning Paths → Interview Prep → Ask AI

Goal: Build AI Product Management knowledge.

---

# Progressive Disclosure

## Discover
High-level summaries, hero content, featured projects, and key metrics.

## Explore
Detailed project pages, articles, frameworks, and demos.

## Deep Dive
PRDs, GitHub repositories, architecture diagrams, evaluation reports, prompt libraries, datasets, and technical documentation.

---

# Global Search

Search should index:
- Projects
- Articles
- PMOS
- Knowledge Hub
- Builder's Journal
- Resume
- GitHub metadata

Support both keyword and semantic search in future releases.

---

# AI Assistant Integration

The AI Assistant should be accessible from every page.

Primary capabilities:
- Answer questions about Veekay
- Explain products
- Recommend articles
- Navigate the knowledge base
- Teach AI Product Management concepts

---

# Content Relationships

Each project should link to:
- Related articles
- Demo videos
- PRD
- GitHub
- Architecture diagrams
- Lessons learned

Each article should link to:
- Related projects
- Frameworks
- PMOS topics
- Suggested next reading

---

# Navigation Principles

- Keep the top navigation simple.
- No page should require more than three clicks to reach.
- Every page should have a clear primary call-to-action.
- Surface the AI Assistant naturally without interrupting the experience.
- Design for desktop first, while remaining fully responsive.

---

# Future Expansion

The architecture should support future additions without restructuring:
- AI PM Academy
- Community
- Open-source projects
- Interactive product playgrounds
- Certifications
- Events and speaking
- Research publications