# AutoCut Development Guide

## Table of Contents
- [Development Environment Setup](#development-environment-setup)
- [Local Development](#local-development)
- [Testing](#testing)
- [Code Style](#code-style)
- [Development Workflow](#development-workflow)
- [Debugging](#debugging)
- [Performance Optimization](#performance-optimization)

## Development Environment Setup

### System Requirements

- **OS**: macOS, Linux, or Windows with WSL2
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 20GB free space
- **CPU**: 4+ cores recommended

### Required Software

#### 1. Install Core Tools

```bash
# macOS
brew install node python git docker

# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm python3 python3-pip git docker.io

# Windows (use WSL2)
# Install Docker Desktop for Windows
# In WSL2:
sudo apt update
sudo apt install nodejs npm python3 python3-pip git
```

#### 2. Install Google Cloud SDK

```bash
# Download and install gcloud
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Initialize gcloud
gcloud init
gcloud auth login
gcloud auth application-default login
```

#### 3. Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

#### 4. Install FFmpeg

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

### Project Setup

#### 1. Clone Repository

```bash
git clone https://github.com/yourusername/AutoCut.git
cd AutoCut
```

#### 2. Setup Development Environment

```bash
# Run setup script
./scripts/setup-dev.sh

# Or manually:
# Copy environment files
cp .env.example .env.development
cp frontend/.env.example frontend/.env.local
cp backend/api/.env.example backend/api/.env
cp backend/processor/.env.example backend/processor/.env
```

#### 3. Install Dependencies

```bash
# Frontend
cd frontend
npm install

# Backend API
cd ../backend/api
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Video Processor
cd ../processor
pip install -r requirements.txt
```

## Local Development

### Running Services Locally

#### Option 1: Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up

# Start specific services
docker-compose up frontend
docker-compose up api
docker-compose up processor

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f api
```

`docker-compose.yml`:
```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    volumes:
      - ./frontend:/app
      - /app/node_modules

  api:
    build: ./backend/api
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=development
      - GCP_PROJECT=autocut-dev
    volumes:
      - ./backend/api:/app
    depends_on:
      - firestore-emulator

  processor:
    build: ./backend/processor
    environment:
      - ENVIRONMENT=development
    volumes:
      - ./backend/processor:/app

  firestore-emulator:
    image: gcr.io/google.com/cloudsdktool/cloud-sdk
    command: gcloud emulators firestore start --host-port=0.0.0.0:8080
    ports:
      - "8080:8080"

  storage-emulator:
    image: fsouza/fake-gcs-server
    ports:
      - "4443:4443"
    command: -scheme http -port 4443
```

#### Option 2: Manual Setup

```bash
# Terminal 1 - Firestore Emulator
gcloud emulators firestore start --host-port=localhost:8080

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - API
cd backend/api
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Terminal 4 - Processor
cd backend/processor
source venv/bin/activate
python main.py
```

### Environment Configuration

#### Frontend (.env.local)
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Firebase Emulator
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL=http://localhost:9099
NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=localhost:8080
NEXT_PUBLIC_STORAGE_EMULATOR_HOST=localhost:9199

# Firebase Config (use dev project)
NEXT_PUBLIC_FIREBASE_API_KEY=your-dev-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=autocut-dev.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=autocut-dev
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=autocut-dev.appspot.com

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=false
```

#### Backend API (.env)
```env
# Environment
ENVIRONMENT=development
DEBUG=true

# GCP Configuration
GCP_PROJECT=autocut-dev
FIRESTORE_EMULATOR_HOST=localhost:8080
STORAGE_EMULATOR_HOST=http://localhost:4443

# API Keys (use test keys)
GEMINI_API_KEY=your-test-api-key

# Service URLs
PROCESSOR_SERVICE_URL=http://localhost:8001

# Feature Flags
ENABLE_RATE_LIMITING=false
ENABLE_CACHE=false
```

### Firebase Emulator Suite

```bash
# Initialize Firebase emulators
firebase init emulators

# Start all emulators
firebase emulators:start

# Start specific emulators
firebase emulators:start --only firestore
firebase emulators:start --only auth,firestore,storage

# Import/Export data
firebase emulators:export ./emulator-data
firebase emulators:start --import=./emulator-data
```

## Testing

### Frontend Testing

```bash
cd frontend

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# E2E tests with Playwright
npm run test:e2e

# Component tests
npm run test:components
```

Example test:
```typescript
// __tests__/components/UploadButton.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import UploadButton from '@/components/UploadButton';

describe('UploadButton', () => {
  it('should trigger file selection on click', () => {
    const onUpload = jest.fn();
    render(<UploadButton onUpload={onUpload} />);

    const button = screen.getByText('Upload Files');
    fireEvent.click(button);

    expect(onUpload).toHaveBeenCalled();
  });
});
```

### Backend Testing

```bash
cd backend/api

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_api.py

# Run with verbose output
pytest -v

# Run only marked tests
pytest -m "slow"
```

Example test:
```python
# tests/test_api.py
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_create_project():
    response = client.post(
        "/api/projects",
        json={"title": "Test Project", "type": "travel"}
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Test Project"

@pytest.mark.asyncio
async def test_analyze_media():
    # Test async endpoints
    response = await client.post("/api/analyze", json={...})
    assert response.status_code == 200
```

### Integration Testing

```bash
# Run integration tests
./scripts/integration-tests.sh

# Test API endpoints
curl -X POST http://localhost:8000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Project"}'

# Test WebSocket connection
wscat -c ws://localhost:8000/ws
```

## Code Style

### Frontend (TypeScript/React)

#### ESLint Configuration
```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "react/prop-types": "off"
  }
}
```

#### Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

Run linting:
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Backend (Python)

#### Black Configuration (pyproject.toml)
```toml
[tool.black]
line-length = 100
target-version = ['py310']
include = '\.pyi?$'

[tool.isort]
profile = "black"
line_length = 100

[tool.pylint]
max-line-length = 100
disable = ["C0111", "R0903"]
```

Run linting:
```bash
# Format with black
black .

# Sort imports
isort .

# Lint with pylint
pylint app/

# Type checking
mypy app/
```

### Pre-commit Hooks

`.pre-commit-config.yaml`:
```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files

  - repo: https://github.com/psf/black
    rev: 23.1.0
    hooks:
      - id: black
        language_version: python3.10

  - repo: https://github.com/pycqa/isort
    rev: 5.12.0
    hooks:
      - id: isort

  - repo: https://github.com/pre-commit/mirrors-eslint
    rev: v8.36.0
    hooks:
      - id: eslint
        files: \.[jt]sx?$
```

Install pre-commit:
```bash
pip install pre-commit
pre-commit install
```

## Development Workflow

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/add-music-selection

# Make changes and commit
git add .
git commit -m "feat: Add music selection interface"

# Push to GitHub
git push origin feature/add-music-selection

# Create pull request
gh pr create --title "Add music selection" --body "Description..."
```

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Build/tooling changes

Examples:
```bash
git commit -m "feat: Add video trimming functionality"
git commit -m "fix: Resolve upload timeout issue"
git commit -m "docs: Update API documentation"
```

### Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] No console.log or print statements
- [ ] Error handling implemented
- [ ] Security best practices followed
- [ ] Performance impact considered

## Debugging

### Frontend Debugging

#### Chrome DevTools
```javascript
// Add breakpoints
debugger;

// Console logging with groups
console.group('Upload Process');
console.log('File:', file);
console.log('Size:', file.size);
console.groupEnd();

// Performance profiling
console.time('render');
// ... code ...
console.timeEnd('render');
```

#### React DevTools
- Install React DevTools extension
- Inspect component props and state
- Profile component renders

#### VS Code Debugging
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Next.js Chrome",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/frontend",
      "sourceMapPathOverrides": {
        "webpack:///./~/*": "${workspaceFolder}/frontend/node_modules/*"
      }
    }
  ]
}
```

### Backend Debugging

#### Python Debugger (pdb)
```python
import pdb

def analyze_media(media_url):
    pdb.set_trace()  # Debugger will stop here
    result = gemini_client.analyze(media_url)
    return result
```

#### VS Code Debugging
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": ["main:app", "--reload"],
      "cwd": "${workspaceFolder}/backend/api"
    }
  ]
}
```

#### Logging
```python
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

logger.debug("Debug message")
logger.info("Info message")
logger.warning("Warning message")
logger.error("Error message")
```

### Common Issues

#### 1. CORS Errors
```python
# backend/api/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### 2. Firestore Emulator Connection
```bash
# Check if emulator is running
curl http://localhost:8080

# Set environment variable
export FIRESTORE_EMULATOR_HOST=localhost:8080
```

#### 3. Memory Issues with Video Processing
```python
# Use streaming for large files
def process_video_stream(video_path):
    cap = cv2.VideoCapture(video_path)
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        # Process frame
        yield process_frame(frame)
    cap.release()
```

## Performance Optimization

### Frontend Performance

#### 1. Code Splitting
```javascript
// Lazy load components
const VideoEditor = lazy(() => import('./components/VideoEditor'));

// Route-based splitting
const EditorPage = lazy(() => import('./pages/Editor'));
```

#### 2. Image Optimization
```javascript
// Use Next.js Image component
import Image from 'next/image';

<Image
  src="/thumbnail.jpg"
  width={300}
  height={200}
  loading="lazy"
  placeholder="blur"
/>
```

#### 3. Memoization
```javascript
// Memoize expensive computations
const expensiveValue = useMemo(() => {
  return computeExpensive(data);
}, [data]);

// Memoize components
const MemoizedComponent = memo(Component);
```

### Backend Performance

#### 1. Async Operations
```python
# Use async/await for I/O operations
async def analyze_media_batch(media_urls: List[str]):
    tasks = [analyze_media(url) for url in media_urls]
    results = await asyncio.gather(*tasks)
    return results
```

#### 2. Caching
```python
from functools import lru_cache

@lru_cache(maxsize=100)
def get_video_metadata(video_path: str):
    # Expensive operation cached
    return extract_metadata(video_path)
```

#### 3. Database Query Optimization
```python
# Use select_related for joins
projects = await db.collection('projects')
    .where('userId', '==', user_id)
    .order_by('createdAt', 'desc')
    .limit(10)
    .get()
```

### Monitoring Performance

```bash
# Frontend bundle analysis
npm run analyze

# Backend profiling
python -m cProfile -o profile.stats main.py
python -m pstats profile.stats

# Memory profiling
pip install memory-profiler
python -m memory_profiler main.py
```

## Development Tools

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-python.python",
    "ms-python.vscode-pylance",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "github.copilot",
    "eamodio.gitlens",
    "ms-azuretools.vscode-docker"
  ]
}
```

### Useful Scripts

```bash
# scripts/dev-setup.sh
#!/bin/bash
echo "Setting up development environment..."
npm install -g concurrently
pip install -r requirements-dev.txt
firebase emulators:download
echo "Setup complete!"

# scripts/reset-db.sh
#!/bin/bash
echo "Resetting local database..."
firebase emulators:start --only firestore --import=./seed-data

# scripts/generate-types.sh
#!/bin/bash
echo "Generating TypeScript types..."
npx openapi-typescript http://localhost:8000/openapi.json -o types/api.ts
```

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Google Cloud Documentation](https://cloud.google.com/docs)
- [Gemini API Documentation](https://ai.google.dev/)

## Support

For development support:
- Slack: #autocut-dev
- Email: dev@autocut.app
- GitHub Discussions: [AutoCut Discussions](https://github.com/yourusername/AutoCut/discussions)