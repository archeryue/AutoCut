# AutoCut - AI-Powered Vlog Generation Platform

<div align="center">

![AutoCut Logo](docs/images/logo.png)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/python-v3.10+-blue.svg)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Google Cloud](https://img.shields.io/badge/Google%20Cloud-Powered-4285F4)](https://cloud.google.com/)
[![Gemini API](https://img.shields.io/badge/Gemini%20API-1.5%20Pro-8E75B2)](https://ai.google.dev/)

*Transform your photos and videos into professional vlogs with AI-powered editing and storytelling*

[Demo](https://autocut-demo.web.app) | [Documentation](./docs) | [API Reference](./docs/API.md) | [Contributing](./CONTRIBUTING.md)

</div>

## 🎬 Overview

AutoCut is an AI-powered automatic video editing tool that transforms your raw photos and videos into engaging vlogs. Using Google's Gemini API for intelligent content analysis and natural language processing, AutoCut creates professional-quality vlogs with minimal effort.

### Key Features

- 📸 **Smart Media Analysis** - AI-powered scene detection, object recognition, and mood analysis
- 🤖 **Intelligent Plan Generation** - Automatic story arc creation based on your content
- 💬 **Conversational Editing** - Modify your vlog plan using natural language
- 🎨 **Professional Effects** - Automatic transitions, music selection, and text overlays
- ☁️ **Cloud-Native** - Built entirely on Google Cloud Platform for scalability
- 🚀 **Fast Processing** - Serverless architecture with automatic scaling

## 📺 Demo

![AutoCut Demo](docs/images/demo.gif)

## 🏗️ Architecture

AutoCut is built with a modern, cloud-native architecture using Google Cloud Platform services:

```
Frontend (Next.js + Firebase) → Cloud Run APIs → GCP Services
                                                 ├── Gemini API (AI Analysis)
                                                 ├── Cloud Storage (Media)
                                                 ├── Firestore (Database)
                                                 ├── Transcoder API (Video)
                                                 └── Cloud CDN (Delivery)
```

For detailed architecture documentation, see [Architecture Guide](./docs/ARCHITECTURE.md).

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- Google Cloud Platform account
- Firebase project
- Gemini API access

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/AutoCut.git
cd AutoCut
```

2. **Set up GCP and Firebase**
```bash
# Install Google Cloud SDK
curl https://sdk.cloud.google.com | bash

# Initialize gcloud and create project
gcloud init
gcloud projects create your-project-id
gcloud config set project your-project-id

# Enable required APIs
./infrastructure/scripts/setup.sh
```

3. **Configure environment variables**
```bash
# Copy example env files
cp frontend/.env.example frontend/.env.local
cp backend/api/.env.example backend/api/.env
cp backend/processor/.env.example backend/processor/.env

# Edit with your GCP project details
```

4. **Install dependencies**
```bash
# Frontend
cd frontend
npm install

# Backend API
cd ../backend/api
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Video Processor
cd ../processor
pip install -r requirements.txt
```

5. **Run locally**
```bash
# Terminal 1 - Frontend
cd frontend
npm run dev

# Terminal 2 - Backend API
cd backend/api
uvicorn main:app --reload

# Terminal 3 - Video Processor
cd backend/processor
python main.py
```

Visit http://localhost:3000 to see the application.

## 📦 Deployment

### One-Click Deploy

[![Deploy to Google Cloud](https://deploy.cloud.run/button.svg)](https://deploy.cloud.run)

### Manual Deployment

```bash
# Deploy everything with one command
./infrastructure/scripts/deploy.sh

# Or deploy individually:
# Frontend to Firebase
firebase deploy --only hosting

# Backend to Cloud Run
gcloud run deploy autocut-api --source backend/api
gcloud run deploy autocut-processor --source backend/processor
```

For detailed deployment instructions, see [Deployment Guide](./docs/DEPLOYMENT.md).

## 📖 Documentation

- [Architecture Overview](./docs/ARCHITECTURE.md) - System design and components
- [API Reference](./docs/API.md) - REST API endpoints and WebSocket events
- [GCP Setup Guide](./docs/GCP_SETUP.md) - Detailed GCP configuration
- [Development Guide](./docs/DEVELOPMENT.md) - Local development setup
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment
- [Contributing](./CONTRIBUTING.md) - Contribution guidelines

## 🎯 Use Cases

### Travel Vlog
Upload your vacation photos and videos, and AutoCut will create a compelling travel story with:
- Chronological organization
- Location-based grouping
- Scenic transitions
- Background music matching the mood

### Daily Vlog
Transform daily clips into engaging content:
- Automatic highlight detection
- Remove boring parts
- Add engaging transitions
- Generate catchy titles

### Event Compilation
Create memorable videos from events:
- Smart moment selection
- Guest detection and grouping
- Music synchronization
- Automatic credits

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **Firebase** - Authentication and hosting
- **Tailwind CSS** - Styling
- **Shadcn/ui** - UI components
- **Zustand** - State management

### Backend
- **FastAPI** - Python web framework
- **Cloud Run** - Serverless deployment
- **FFmpeg** - Video processing
- **Gemini API** - AI analysis
- **Cloud Tasks** - Job queue

### Infrastructure
- **Google Cloud Platform** - Cloud provider
- **Firebase** - Frontend services
- **Firestore** - NoSQL database
- **Cloud Storage** - Media storage
- **Transcoder API** - Video encoding
- **Cloud CDN** - Content delivery

## 📊 Performance

- ⚡ **Upload Speed**: Direct to Cloud Storage with resumable uploads
- 🚀 **Processing Time**: 2-5 minutes for a 10-minute vlog
- 🌍 **Global CDN**: Sub-100ms latency worldwide
- 📈 **Scalability**: Auto-scales from 0 to 1000+ concurrent users

## 💰 Pricing

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0/month | 5 vlogs/month, 720p export, 5GB storage |
| **Pro** | $9.99/month | 50 vlogs/month, 1080p export, 100GB storage |
| **Business** | $49.99/month | Unlimited vlogs, 4K export, 1TB storage |

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gemini team for the powerful AI API
- FFmpeg community for video processing tools
- Next.js and FastAPI communities
- All our contributors and users

## 📞 Support

- 📧 Email: support@autocut.app
- 💬 Discord: [Join our community](https://discord.gg/autocut)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/AutoCut/issues)
- 📖 Docs: [Documentation](https://docs.autocut.app)

## 🗺️ Roadmap

- [ ] Mobile app (iOS/Android)
- [ ] AI voice-over generation
- [ ] Custom music creation
- [ ] Multi-language support
- [ ] Collaborative editing
- [ ] Social media optimization
- [ ] Plugin system
- [ ] Desktop app

---

<div align="center">
Made with ❤️ by the AutoCut Team

⭐ Star us on GitHub!
</div>