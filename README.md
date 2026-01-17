# VisionSprint 🚀

A full-stack hackathon project management system for teams to submit ideas, vote, form teams, execute sprints, and showcase results.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwind-css)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [Available Scripts](#-available-scripts)
- [Application Stages](#-application-stages)
- [Admin Guide](#-admin-guide)
- [API Reference](#-api-reference)
- [Contributing](#-contributing)
- [Changelog](#-changelog)

---

## ✨ Features

### Stage 1: Receiving Submissions
- 🔐 Google OAuth authentication
- 📝 Submit project ideas with rich details
- 🗳️ Vote for favorite projects
- 🏷️ Filter by project type (Moon Shot, Small Feature, Delight, Efficiency)
- ✏️ Edit/delete your own projects
- 👥 See voter avatars on each project

### Stage 2: Executing Sprint
- ⏱️ Countdown timer to deadline
- 👥 Team formation (groups of 3)
- 📎 Edit only Slack channel and doc links
- 🎬 Submit Google Drive video links
- 📊 Track team progress

### Stage 3: Sprint Over (Showcase)
- 🎥 Fullscreen video player with navigation
- ▶️ Auto-advance between videos
- 👤 Team info overlay on hover
- 🎭 Emoji reactions (🥇 Medal, ❤️ Heart, 😱 Shock, 🎉 Party)
- 📈 Watch progress tracking
- 🎊 Confetti celebration when all videos watched

### Admin Features
- 🎛️ Stage toggle controls
- 🧪 Test mode to bypass restrictions
- 👥 Team formation interface
- 📋 Project duplication for multiple teams

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Database** | PostgreSQL |
| **ORM** | Prisma 5 |
| **Auth** | NextAuth.js 4 (Google OAuth) |
| **Styling** | Tailwind CSS 4 |
| **Animations** | Framer Motion |
| **Confetti** | canvas-confetti |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Google Cloud Console account (for OAuth)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/visionsprint.git
   cd visionsprint
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. **Set up the database**
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed  # Optional: adds sample data
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   ```
   http://localhost:3000
   ```

---

## 📁 Project Structure

```
visionsprint/
├── app/                          # Next.js App Router
│   ├── admin/                    # Admin dashboard
│   │   └── page.tsx
│   ├── api/                      # API routes
│   │   ├── admin/               # Admin endpoints
│   │   │   ├── duplicate-project/
│   │   │   ├── state/
│   │   │   └── users/
│   │   ├── auth/                # NextAuth
│   │   ├── projects/            # Project CRUD
│   │   ├── reactions/           # Emoji reactions
│   │   ├── submissions/         # Video submissions
│   │   ├── teams/               # Team management
│   │   ├── votes/               # Voting
│   │   └── watched/             # Watch tracking
│   ├── auth/                    # Auth pages
│   │   └── signin/
│   ├── projects/                # Project pages
│   │   ├── [id]/
│   │   │   ├── edit/
│   │   │   └── page.tsx
│   │   └── new/
│   ├── showcase/                # Video showcase
│   ├── sprint/                  # Sprint dashboard
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page
├── components/                   # React components
│   ├── providers/               # Context providers
│   │   ├── AppStateProvider.tsx
│   │   ├── SessionProvider.tsx
│   │   └── index.tsx
│   ├── ConfettiCelebration.tsx
│   ├── EmptyState.tsx
│   ├── Navigation.tsx
│   ├── ProjectCard.tsx
│   ├── ProjectForm.tsx
│   ├── Timer.tsx
│   └── VideoPlayer.tsx
├── lib/                         # Utilities
│   ├── auth.ts                  # NextAuth config
│   ├── prisma.ts                # Prisma client
│   └── utils.ts                 # Helper functions
├── prisma/                      # Database
│   ├── schema.prisma            # Schema definition
│   └── seed.ts                  # Seed script
├── types/                       # TypeScript types
│   └── index.ts
├── public/                      # Static assets
├── .env.example                 # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔐 Environment Variables

Create a `.env` file with the following:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/visionsprint?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-min-32-chars"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth Client ID**
5. Configure the OAuth consent screen
6. Set authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
7. Copy Client ID and Secret to `.env`

---

## 🗄️ Database Setup

### Using Docker (Recommended)

```bash
docker run --name visionsprint-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=visionsprint \
  -p 5432:5432 \
  -d postgres:16
```

### Database Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (development)
npm run db:push

# Create migration (production)
npm run db:migrate

# Seed with sample data
npm run db:seed

# Open Prisma Studio (GUI)
npm run db:studio

# Reset database
npm run db:reset
```

---

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run migrations |
| `npm run db:seed` | Seed database |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:reset` | Reset database |

---

## 🎭 Application Stages

The application has three main stages, controlled by admin:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   RECEIVING_SUBMISSIONS  ──►  EXECUTING_SPRINT  ──►  SPRINT_OVER
│                                                             │
│   • Submit projects          • Timer countdown         • Watch videos
│   • Vote for ideas           • Limited editing         • React with emojis
│   • Edit/delete              • Submit videos           • Celebration!
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Stage Details

| Stage | What Users Can Do | What's Restricted |
|-------|-------------------|-------------------|
| **Receiving Submissions** | Create, edit, delete projects; Vote | - |
| **Executing Sprint** | Edit Slack/docs only; Submit video | No new projects; No voting |
| **Sprint Over** | Watch videos; React with emojis | All editing disabled |

---

## 👑 Admin Guide

### Making a User Admin

**Option 1: Via Prisma Studio**
```bash
npm run db:studio
# Navigate to User table, set isAdmin = true
```

**Option 2: Via SQL**
```sql
UPDATE "User" SET "isAdmin" = true WHERE email = 'admin@example.com';
```

### Admin Dashboard Features

Access at `/admin`:

1. **Stage Controls** - Switch between application stages
2. **Test Mode** - Bypass stage restrictions for testing
3. **Sprint Dates** - Set countdown timer dates
4. **Team Formation** - Assign users to teams (groups of 3)
5. **Project Duplication** - Create copies for multiple teams

### Test Mode

Enable **Test Mode** to:
- Create/edit projects in any stage
- Vote in any stage
- Test all features without restrictions

---

## 📡 API Reference

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create project |
| `GET` | `/api/projects/[id]` | Get single project |
| `PUT` | `/api/projects/[id]` | Update project |
| `DELETE` | `/api/projects/[id]` | Delete project |

### Votes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/votes` | Cast vote |
| `DELETE` | `/api/votes?projectId=` | Remove vote |

### Teams

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/teams` | List all teams |
| `POST` | `/api/teams` | Create team (admin) |
| `DELETE` | `/api/teams/[id]` | Delete team (admin) |

### Submissions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/submissions` | Submit video URL |

### Reactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/reactions?projectId=` | Get reactions |
| `POST` | `/api/reactions` | Toggle reaction |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/state` | Get app state |
| `PUT` | `/api/admin/state` | Update app state |
| `GET` | `/api/admin/users` | List users |
| `POST` | `/api/admin/duplicate-project` | Duplicate project |

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Database ORM by [Prisma](https://www.prisma.io/)
- Authentication by [NextAuth.js](https://next-auth.js.org/)

---

<p align="center">
  Made with ❤️ for hackathon teams everywhere
</p>
