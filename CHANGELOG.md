# Changelog

All notable changes to VisionSprint will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Initial release of VisionSprint

---

## [1.0.0] - 2026-01-17

### Added

#### Authentication
- Google OAuth integration via NextAuth.js
- Session management with database persistence
- Admin role support

#### Projects (Stage 1: Receiving Submissions)
- Create, read, update, delete projects
- Project types: Moon Shot, Small Feature, Delight, Efficiency
- Voting system with visual voter avatars
- Filter projects by type
- Empty state illustration for new projects
- Automatic creator name from Google account

#### Sprint Execution (Stage 2)
- Countdown timer to sprint deadline
- Restricted editing (Slack channel and docs only)
- Video submission via Google Drive links
- Team progress tracking

#### Showcase (Stage 3)
- Fullscreen video player
- Left/right navigation between videos
- Auto-advance functionality
- Team info overlay on hover
- Emoji reactions (Medal, Heart, Shock, Party)
- Watch progress tracking
- Confetti celebration on completion

#### Admin Features
- Stage toggle controls (Submissions → Sprint → Showcase)
- Test mode to bypass stage restrictions
- Sprint start/end date configuration
- Team formation interface
- Project duplication for multiple teams
- User management

#### UI/UX
- Dark mode design with glassmorphism
- Gradient mesh background
- Custom Outfit + JetBrains Mono fonts
- Smooth animations and transitions
- Responsive design

#### Developer Experience
- TypeScript throughout
- Prisma ORM with PostgreSQL
- Database seed script
- Comprehensive API routes
- Environment variable configuration

### Technical Details
- Next.js 16 with App Router
- Prisma 5 with PostgreSQL
- NextAuth.js 4
- Tailwind CSS 4
- Framer Motion for animations
- canvas-confetti for celebrations

---

## Version History Format

### [X.Y.Z] - YYYY-MM-DD

#### Added
- New features

#### Changed
- Changes in existing functionality

#### Deprecated
- Features to be removed in future

#### Removed
- Removed features

#### Fixed
- Bug fixes

#### Security
- Security updates
