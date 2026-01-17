# Contributing to VisionSprint

Thank you for your interest in contributing to VisionSprint! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Commit Messages](#commit-messages)
- [Pull Requests](#pull-requests)
- [Reporting Issues](#reporting-issues)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

---

## Getting Started

1. **Fork the repository**
   
   Click the "Fork" button on GitHub to create your own copy.

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR-USERNAME/visionsprint.git
   cd visionsprint
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/ORIGINAL-OWNER/visionsprint.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Set up environment**
   ```bash
   cp .env.example .env
   # Configure your local database and OAuth credentials
   ```

6. **Set up database**
   ```bash
   npm run db:push
   npm run db:seed
   ```

---

## Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**
   - Write clean, readable code
   - Add tests if applicable
   - Update documentation as needed

3. **Run linting**
   ```bash
   npm run lint
   ```

4. **Test your changes**
   ```bash
   npm run build
   npm run dev
   # Manually test your changes
   ```

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   
   Go to GitHub and create a PR from your fork to the main repository.

---

## Code Style

### TypeScript

- Use TypeScript for all new files
- Define proper types, avoid `any`
- Use interfaces for object shapes
- Export types from `types/index.ts`

### React Components

- Use functional components with hooks
- Place components in `components/` directory
- Use descriptive component names (PascalCase)
- Extract reusable logic into custom hooks

### File Naming

- Components: `PascalCase.tsx` (e.g., `ProjectCard.tsx`)
- Utilities: `camelCase.ts` (e.g., `utils.ts`)
- API routes: `route.ts` in appropriate folder

### CSS/Styling

- Use Tailwind CSS utility classes
- Custom styles go in `globals.css`
- Use CSS variables for theming
- Follow existing patterns for glass cards, buttons, etc.

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style (formatting, semicolons, etc.) |
| `refactor` | Code refactoring |
| `test` | Adding/updating tests |
| `chore` | Maintenance tasks |

### Examples

```bash
feat(projects): add project duplication feature
fix(auth): resolve Google OAuth callback error
docs(readme): update installation instructions
style(components): format ProjectCard component
refactor(api): simplify vote endpoint logic
```

---

## Pull Requests

### Before Submitting

- [ ] Code follows the project's style guidelines
- [ ] Self-reviewed my code
- [ ] Added comments for complex logic
- [ ] Updated documentation if needed
- [ ] No new linting errors
- [ ] Changes work locally

### PR Description Template

```markdown
## Description
Brief description of the changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How Has This Been Tested?
Describe how you tested your changes.

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
```

---

## Reporting Issues

### Bug Reports

Include:
- Clear, descriptive title
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots if applicable
- Environment details (OS, browser, Node version)

### Feature Requests

Include:
- Clear, descriptive title
- Problem or use case
- Proposed solution
- Alternative solutions considered

---

## Questions?

Feel free to open an issue for any questions about contributing!
