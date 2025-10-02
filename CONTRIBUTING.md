# Contributing to Quran Voice Search Project

Thank you for your interest in contributing to this Islamic tech project! This guide will help you get started.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- MongoDB (optional - project works with dummy data)

### Setup
1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/My-Job-Project.git`
3. Install dependencies: `npm install`
4. Start development server: `npm run dev`

## 🏗️ Project Structure

```
src/
├── app/                 # Next.js App Router pages and API routes
│   ├── api/            # Backend API endpoints
│   ├── bookmarks/      # Bookmarks page
│   ├── history/        # Recitation history page
│   └── search/         # Search functionality
├── components/         # Reusable React components
├── lib/               # Utility functions and configurations
│   ├── db.ts          # Database connection
│   ├── models.ts      # MongoDB schemas
│   ├── quranApi.ts    # External API integration
│   └── dummyData.ts   # Sample data for development
```

## 🛠️ Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow ESLint configuration
- Use Tailwind CSS for styling
- Maintain RTL support for Arabic text

### Islamic Content Guidelines
- Ensure respectful handling of Quranic text
- Maintain accuracy in Arabic transliterations
- Follow Islamic principles in feature design

### Testing
- Write unit tests for new components
- Test Arabic text rendering
- Verify voice recognition functionality

## 📝 Commit Guidelines

Use conventional commits:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `style:` for formatting changes
- `refactor:` for code refactoring

## 🤝 Pull Request Process

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Add tests if applicable
4. Update documentation
5. Submit a pull request

## 🔍 Areas for Contribution

- **Performance Optimization**: Caching, lazy loading
- **Accessibility**: Screen reader support, keyboard navigation
- **Internationalization**: Multi-language support
- **Testing**: Unit and integration tests
- **Documentation**: API docs, user guides
- **Islamic Features**: Prayer times, Qibla direction, etc.

## 📞 Questions?

Feel free to open an issue for any questions or suggestions!
