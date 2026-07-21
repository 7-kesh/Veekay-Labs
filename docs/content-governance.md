

# Veekay Labs
## Content Governance

---

# Purpose

This document defines how knowledge is created, organized, maintained, and reused across Veekay Labs. The objective is to ensure every piece of content has a single authoritative home, remains discoverable, and can be consumed consistently by both visitors and the AI Assistant.

---

# Governance Principles

## Single Source of Truth
Every topic should have one canonical document. Other pages should reference or summarize it instead of duplicating it.

## Build Once, Reuse Everywhere
Knowledge created once should power:
- Website pages
- Project case studies
- PMOS
- Articles
- AI Assistant
- GitHub documentation
- Presentations
- Demo videos

## Progressive Disclosure
Publish high-level summaries on landing pages and link to deeper documentation rather than repeating information.

## Authenticity
Only publish work based on real experience, real projects, experiments, or documented research.

## Continuous Improvement
Content is versioned and updated as products evolve.

---

# Canonical Content Hierarchy

1. Vision & Strategy
2. PMOS Knowledge Base
3. Project PRDs
4. Project Case Studies
5. Articles & Essays
6. Website Pages
7. Social Posts

Lower-level assets should reference higher-level sources whenever possible.

---

# Repository Structure

/docs
  /vision
  /pmos
  /projects
  /articles
  /frameworks
  /templates
  /architecture
  /roadmaps
  /website

Each folder should contain a README explaining its purpose.

---

# Content Types

## Evergreen
Long-term reference material such as PMOS chapters, frameworks, templates, and architecture.

## Product Documentation
PRDs, roadmaps, evaluations, architecture diagrams, demos, and lessons learned.

## Thought Leadership
Medium articles, Substack newsletters, LinkedIn posts, and essays.

## Activity Updates
Builder's Journal, Weekly Build Logs, and project progress updates.

---

# Cross-Linking Rules

Every Project should link to:
- PRD
- Roadmap
- Demo
- GitHub
- Related Articles
- Architecture
- Lessons Learned

Every Article should link to:
- Related Project
- PMOS Topic
- Framework
- Follow-up Reading

Every PMOS topic should reference:
- Practical examples
- Projects
- Articles
- Templates

---

# AI Knowledge Governance

Only approved and published content should be indexed by the AI Assistant.

Preferred ingestion order:
1. Vision
2. PMOS
3. PRDs
4. Case Studies
5. Articles
6. Builder's Journal
7. GitHub READMEs
8. Resume

The AI should always answer using canonical sources and recommend related resources.

---

# Publishing Workflow

Idea
→ Draft
→ Technical Review
→ Content Review
→ Publish
→ Cross-link
→ AI Index
→ Monitor
→ Update

---

# Content Quality Checklist

Before publishing, verify:
- Clear purpose
- Canonical location identified
- No duplicate content
- Accurate cross-links
- Grammar and readability
- Business impact included where applicable
- Related AI knowledge updated

---

# Versioning

Major updates should record:
- Version
- Date
- Author
- Summary of changes

Significant changes to projects, PMOS, or frameworks should trigger an AI knowledge re-index.

---

# Ownership

| Content Type | Owner |
|--------------|-------|
| Vision | Veekay |
| PMOS | Veekay |
| Projects | Veekay |
| Articles | Veekay |
| Website | Veekay |
| AI Knowledge | Veekay |

---

# Long-Term Goal

Create a living knowledge ecosystem where every project, article, framework, demo, and AI conversation is interconnected. New knowledge should naturally flow into the website, PMOS, GitHub, and AI Assistant without duplication, ensuring Veekay Labs remains a trusted, maintainable, and continuously evolving AI Product Management platform.