# Contributing to AutoCut

First off, thank you for considering contributing to AutoCut! It's people like you that make AutoCut such a great tool. We welcome contributions from everyone, regardless of their experience level.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Process](#development-process)
- [Style Guides](#style-guides)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

## Code of Conduct

### Our Pledge

We pledge to make participation in our project and our community a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

Examples of behavior that contributes to creating a positive environment include:

* Using welcoming and inclusive language
* Being respectful of differing viewpoints and experiences
* Gracefully accepting constructive criticism
* Focusing on what is best for the community
* Showing empathy towards other community members

Examples of unacceptable behavior include:

* The use of sexualized language or imagery and unwelcome sexual attention or advances
* Trolling, insulting/derogatory comments, and personal or political attacks
* Public or private harassment
* Publishing others' private information without explicit permission
* Other conduct which could reasonably be considered inappropriate

### Enforcement

Project maintainers are responsible for clarifying the standards of acceptable behavior and are expected to take appropriate and fair corrective action in response to any instances of unacceptable behavior.

## Getting Started

### Prerequisites

Before you begin contributing, make sure you have:

1. A GitHub account
2. Git installed on your local machine
3. Node.js 18+ and npm
4. Python 3.10+
5. Google Cloud SDK (optional, for GCP-related contributions)
6. Read our [Development Guide](docs/DEVELOPMENT.md)

### Setting Up Your Development Environment

1. **Fork the repository**
   - Go to https://github.com/yourusername/AutoCut
   - Click the "Fork" button in the top right

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/AutoCut.git
   cd AutoCut
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/yourusername/AutoCut.git
   ```

4. **Install dependencies**
   ```bash
   # Frontend
   cd frontend
   npm install

   # Backend
   cd ../backend/api
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   ```

5. **Set up pre-commit hooks**
   ```bash
   pip install pre-commit
   pre-commit install
   ```

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

**Bug Report Template:**
```markdown
### Description
[A clear and concise description of the bug]

### Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

### Expected Behavior
[What you expected to happen]

### Actual Behavior
[What actually happened]

### Screenshots
[If applicable, add screenshots]

### Environment
- OS: [e.g., macOS 12.0]
- Browser: [e.g., Chrome 96]
- Node version: [e.g., 18.0.0]
- Python version: [e.g., 3.10.0]

### Additional Context
[Any other context about the problem]
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

**Feature Request Template:**
```markdown
### Problem Statement
[Describe the problem this feature would solve]

### Proposed Solution
[Describe how you envision this feature working]

### Alternatives Considered
[What other solutions have you considered?]

### Additional Context
[Any mockups, examples, or additional information]
```

### Your First Code Contribution

Unsure where to begin? Look for these labels in our issues:

- `good first issue` - Good for newcomers
- `help wanted` - We need help with these
- `documentation` - Help improve our docs
- `frontend` - Frontend-specific issues
- `backend` - Backend-specific issues

### Areas Where We Need Help

- **Documentation**: Help us improve our docs
- **Testing**: Write tests to increase coverage
- **Bug fixes**: Help us squash bugs
- **Features**: Implement new features
- **Performance**: Optimize existing code
- **UI/UX**: Improve the user interface
- **Accessibility**: Make AutoCut more accessible
- **Internationalization**: Help translate AutoCut

## Development Process

### Branching Strategy

We use Git Flow for our branching strategy:

```
main (production)
 └── develop (main development)
      ├── feature/your-feature
      ├── bugfix/bug-description
      └── hotfix/critical-fix
```

### Creating a Feature Branch

```bash
# Update your local repository
git checkout develop
git pull upstream develop

# Create your feature branch
git checkout -b feature/your-awesome-feature

# Make your changes
git add .
git commit -m "feat: Add awesome feature"

# Push to your fork
git push origin feature/your-awesome-feature
```

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, semicolons, etc.)
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `test:` Adding or updating tests
- `build:` Build system changes
- `ci:` CI/CD changes
- `chore:` Other changes (updating dependencies, etc.)

**Examples:**
```bash
feat: Add video trimming functionality
fix: Resolve upload timeout issue for large files
docs: Update API documentation for /render endpoint
style: Format code with Black and Prettier
refactor: Extract video processing into separate module
perf: Optimize image loading with lazy loading
test: Add unit tests for plan generation
build: Update webpack configuration
ci: Add GitHub Actions workflow for deployment
chore: Update dependencies to latest versions
```

### Testing

All code must be tested:

#### Frontend Testing
```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test
npm test -- --testNamePattern="UploadButton"
```

#### Backend Testing
```bash
# Run tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test
pytest tests/test_api.py::test_create_project
```

#### Writing Tests

**Frontend Example:**
```typescript
describe('PlanEditor', () => {
  it('should update timeline when clips are reordered', async () => {
    const { getByTestId } = render(<PlanEditor plan={mockPlan} />);

    // Test implementation
    const clip = getByTestId('clip-1');
    fireEvent.drag(clip, { to: 'position-2' });

    expect(mockOnUpdate).toHaveBeenCalledWith(expectedPlan);
  });
});
```

**Backend Example:**
```python
@pytest.mark.asyncio
async def test_generate_plan():
    # Arrange
    project_id = "test_project"
    mock_analysis = {"scenes": [...]}

    # Act
    plan = await generate_plan(project_id, mock_analysis)

    # Assert
    assert plan.timeline is not None
    assert len(plan.timeline) > 0
```

## Style Guides

### TypeScript/JavaScript Style Guide

- Use TypeScript for all new code
- Use functional components with hooks in React
- Use `const` and `let`, never `var`
- Use arrow functions for callbacks
- Use template literals for string concatenation
- Always use strict equality (`===` and `!==`)

```typescript
// Good
const processVideo = async (videoId: string): Promise<Video> => {
  const video = await fetchVideo(videoId);
  return processVideoData(video);
};

// Bad
function processVideo(videoId) {
  var video = fetchVideo(videoId);
  return processVideoData(video);
}
```

### Python Style Guide

- Follow PEP 8
- Use type hints for all functions
- Use f-strings for string formatting
- Use async/await for I/O operations
- Document all functions with docstrings

```python
# Good
async def process_video(video_id: str) -> Dict[str, Any]:
    """
    Process a video and return metadata.

    Args:
        video_id: The ID of the video to process

    Returns:
        Dictionary containing video metadata

    Raises:
        VideoNotFoundError: If video doesn't exist
    """
    video = await fetch_video(video_id)
    return await extract_metadata(video)

# Bad
def process_video(video_id):
    video = fetch_video(video_id)
    return extract_metadata(video)
```

### CSS/Tailwind Style Guide

- Use Tailwind classes over custom CSS when possible
- Group related styles together
- Use consistent spacing
- Follow mobile-first approach

```jsx
// Good
<div className="flex flex-col gap-4 p-4 md:flex-row md:gap-6 md:p-6">
  <button className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
    Click me
  </button>
</div>

// Bad
<div className="p-4 md:p-6 flex md:flex-row flex-col gap-4 md:gap-6">
  <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
    Click me
  </button>
</div>
```

## Pull Request Process

### Before Submitting

1. **Update documentation** if you're changing functionality
2. **Add tests** for new features
3. **Run tests** to ensure nothing is broken
4. **Run linters** to ensure code style
5. **Update CHANGELOG.md** with your changes

### Submitting a Pull Request

1. **Create Pull Request**
   - Go to your fork on GitHub
   - Click "New pull request"
   - Select `develop` as the base branch
   - Fill out the PR template

2. **PR Template:**
```markdown
## Description
[Describe your changes]

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code where necessary
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests
- [ ] New and existing tests pass
- [ ] Any dependent changes have been merged

## Screenshots (if applicable)
[Add screenshots of UI changes]

## Related Issues
Fixes #(issue number)
```

3. **Code Review Process**
   - Maintainers will review your PR
   - Address any feedback
   - Once approved, your PR will be merged

### After Your PR is Merged

- Delete your feature branch
- Pull the latest changes from upstream
- Celebrate your contribution! 🎉

## Community

### Getting Help

- **Discord**: Join our [Discord server](https://discord.gg/autocut)
- **GitHub Discussions**: Ask questions in [Discussions](https://github.com/yourusername/AutoCut/discussions)
- **Stack Overflow**: Tag your questions with `autocut`

### Staying Updated

- Watch the repository for updates
- Follow us on [Twitter](https://twitter.com/autocut)
- Read our [blog](https://blog.autocut.app)
- Subscribe to our [newsletter](https://autocut.app/newsletter)

### Recognition

We believe in recognizing our contributors:

- All contributors are listed in [AUTHORS.md](AUTHORS.md)
- Significant contributors get:
  - Mention in release notes
  - Special Discord role
  - AutoCut Pro subscription

## Development Tips

### Debugging

```bash
# Frontend debugging
npm run dev -- --debug

# Backend debugging
python -m pdb main.py

# View logs
docker-compose logs -f api
```

### Performance Profiling

```bash
# Frontend profiling
npm run build -- --profile

# Backend profiling
python -m cProfile -o profile.stats main.py
```

### Common Issues

**Issue**: Tests failing locally but passing in CI
**Solution**: Ensure you're using the same versions as CI
```bash
nvm use
python --version
```

**Issue**: Import errors in Python
**Solution**: Ensure virtual environment is activated
```bash
source venv/bin/activate
```

## Resources

### Learning Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Google Cloud Documentation](https://cloud.google.com/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Gemini API Documentation](https://ai.google.dev/)

### Internal Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## Questions?

If you have questions about contributing, feel free to:

- Ask in our [Discord #contributors channel](https://discord.gg/autocut)
- Open a [GitHub Discussion](https://github.com/yourusername/AutoCut/discussions)
- Email us at contributors@autocut.app

## License

By contributing to AutoCut, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to AutoCut! Your efforts help make video editing accessible to everyone. 🎬✨