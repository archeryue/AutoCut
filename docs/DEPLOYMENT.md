# AutoCut Deployment Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Deployment Options](#deployment-options)
  - [Quick Deploy](#quick-deploy)
  - [Manual Deployment](#manual-deployment)
  - [CI/CD Pipeline](#cicd-pipeline)
- [Configuration](#configuration)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools
- Google Cloud SDK (`gcloud`)
- Firebase CLI
- Docker
- Node.js 18+
- Python 3.10+
- Git

### GCP Services to Enable
```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  firestore.googleapis.com \
  firebase.googleapis.com \
  storage-component.googleapis.com \
  transcoder.googleapis.com \
  cloudtasks.googleapis.com \
  secretmanager.googleapis.com \
  aiplatform.googleapis.com \
  monitoring.googleapis.com
```

## Environment Setup

### 1. Create GCP Project

```bash
# Create new project
gcloud projects create autocut-prod --name="AutoCut Production"

# Set as default project
gcloud config set project autocut-prod

# Link billing account
gcloud beta billing projects link autocut-prod \
  --billing-account=BILLING_ACCOUNT_ID

# Set default region
gcloud config set run/region us-central1
```

### 2. Setup Firebase

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase project
firebase init

# Select:
# - Hosting
# - Firestore
# - Functions (optional)
# - Storage
```

### 3. Configure Service Accounts

```bash
# Create service account for Cloud Run
gcloud iam service-accounts create autocut-runner \
  --display-name="AutoCut Cloud Run Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding autocut-prod \
  --member="serviceAccount:autocut-runner@autocut-prod.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding autocut-prod \
  --member="serviceAccount:autocut-runner@autocut-prod.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding autocut-prod \
  --member="serviceAccount:autocut-runner@autocut-prod.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding autocut-prod \
  --member="serviceAccount:autocut-runner@autocut-prod.iam.gserviceaccount.com" \
  --role="roles/cloudtasks.enqueuer"
```

## Deployment Options

### Quick Deploy

Use our automated deployment script:

```bash
# Clone repository
git clone https://github.com/yourusername/AutoCut.git
cd AutoCut

# Run deployment script
./deploy.sh production
```

The script will:
1. Build Docker images
2. Deploy to Cloud Run
3. Deploy frontend to Firebase
4. Configure environment variables
5. Run smoke tests

### Manual Deployment

#### Step 1: Deploy Backend API

```bash
# Navigate to API directory
cd backend/api

# Build and deploy to Cloud Run
gcloud run deploy autocut-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --service-account autocut-runner@autocut-prod.iam.gserviceaccount.com \
  --set-env-vars "GCP_PROJECT=autocut-prod" \
  --set-env-vars "ENVIRONMENT=production" \
  --set-secrets "GEMINI_API_KEY=gemini-api-key:latest" \
  --memory 1Gi \
  --cpu 2 \
  --min-instances 1 \
  --max-instances 100 \
  --timeout 300
```

#### Step 2: Deploy Video Processor

```bash
# Navigate to processor directory
cd backend/processor

# Build and deploy to Cloud Run
gcloud run deploy autocut-processor \
  --source . \
  --platform managed \
  --region us-central1 \
  --no-allow-unauthenticated \
  --service-account autocut-runner@autocut-prod.iam.gserviceaccount.com \
  --set-env-vars "GCP_PROJECT=autocut-prod" \
  --set-env-vars "ENVIRONMENT=production" \
  --memory 4Gi \
  --cpu 4 \
  --min-instances 0 \
  --max-instances 50 \
  --timeout 3600
```

#### Step 3: Deploy Frontend

```bash
# Navigate to frontend directory
cd frontend

# Build production bundle
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

#### Step 4: Configure Cloud Storage

```bash
# Create storage buckets
gsutil mb -p autocut-prod -c standard -l us-central1 gs://autocut-media-prod
gsutil mb -p autocut-prod -c standard -l us-central1 gs://autocut-render-prod

# Set CORS policy
echo '[
  {
    "origin": ["https://autocut.app"],
    "method": ["GET", "PUT", "POST", "DELETE"],
    "responseHeader": ["*"],
    "maxAgeSeconds": 3600
  }
]' > cors.json

gsutil cors set cors.json gs://autocut-media-prod
gsutil cors set cors.json gs://autocut-render-prod

# Set lifecycle policy for cost optimization
echo '{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 30}
      },
      {
        "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
        "condition": {"age": 7}
      }
    ]
  }
}' > lifecycle.json

gsutil lifecycle set lifecycle.json gs://autocut-media-prod
```

#### Step 5: Setup Cloud Tasks

```bash
# Create task queue
gcloud tasks queues create video-processing \
  --location=us-central1 \
  --max-concurrent-dispatches=10 \
  --max-attempts=3 \
  --min-backoff=10s \
  --max-backoff=300s
```

#### Step 6: Configure Firestore

```bash
# Create Firestore indexes
gcloud firestore indexes create --collection-group=projects \
  --field-config field-path=userId,order=ascending \
  --field-config field-path=createdAt,order=descending

gcloud firestore indexes create --collection-group=projects \
  --field-config field-path=status,order=ascending \
  --field-config field-path=updatedAt,order=descending
```

### CI/CD Pipeline

#### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  GCP_PROJECT: autocut-prod
  REGION: us-central1

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'

      - name: Run Frontend Tests
        run: |
          cd frontend
          npm ci
          npm run test

      - name: Run Backend Tests
        run: |
          cd backend/api
          pip install -r requirements-dev.txt
          pytest

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ env.GCP_PROJECT }}

      - name: Deploy API to Cloud Run
        run: |
          cd backend/api
          gcloud run deploy autocut-api \
            --source . \
            --region ${{ env.REGION }}

      - name: Deploy Processor to Cloud Run
        run: |
          cd backend/processor
          gcloud run deploy autocut-processor \
            --source . \
            --region ${{ env.REGION }}

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Build Frontend
        run: |
          cd frontend
          npm ci
          npm run build
        env:
          NEXT_PUBLIC_API_URL: https://api.autocut.app
          NEXT_PUBLIC_FIREBASE_CONFIG: ${{ secrets.FIREBASE_CONFIG }}

      - name: Deploy to Firebase
        uses: w9jds/firebase-action@master
        with:
          args: deploy --only hosting
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

#### Cloud Build Configuration

Create `cloudbuild.yaml`:

```yaml
steps:
  # Build and push API image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/autocut-api', './backend/api']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/autocut-api']

  # Deploy API to Cloud Run
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'autocut-api'
      - '--image=gcr.io/$PROJECT_ID/autocut-api'
      - '--region=us-central1'
      - '--platform=managed'

  # Build and deploy processor
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/autocut-processor', './backend/processor']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/autocut-processor']

  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'autocut-processor'
      - '--image=gcr.io/$PROJECT_ID/autocut-processor'
      - '--region=us-central1'
      - '--platform=managed'

  # Deploy frontend to Firebase
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['ci']
    dir: 'frontend'

  - name: 'node:18'
    entrypoint: 'npm'
    args: ['run', 'build']
    dir: 'frontend'

  - name: 'gcr.io/$PROJECT_ID/firebase'
    args: ['deploy', '--only', 'hosting']
    dir: 'frontend'

timeout: 1200s
```

## Configuration

### Environment Variables

#### API Service
```env
# .env.production
GCP_PROJECT=autocut-prod
ENVIRONMENT=production
FIRESTORE_DATABASE=(default)
STORAGE_BUCKET=autocut-media-prod
RENDER_BUCKET=autocut-render-prod
GEMINI_MODEL=gemini-1.5-pro-001
CLOUD_TASKS_QUEUE=video-processing
LOG_LEVEL=info
```

#### Processor Service
```env
# .env.production
GCP_PROJECT=autocut-prod
ENVIRONMENT=production
STORAGE_BUCKET=autocut-media-prod
RENDER_BUCKET=autocut-render-prod
TRANSCODER_LOCATION=us-central1
MAX_WORKERS=4
FFMPEG_THREADS=8
```

#### Frontend
```env
# .env.production
NEXT_PUBLIC_API_URL=https://api.autocut.app
NEXT_PUBLIC_WS_URL=wss://api.autocut.app
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=autocut.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=autocut-prod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=autocut-prod.appspot.com
```

### Secret Management

```bash
# Create secrets in Secret Manager
echo -n "your-gemini-api-key" | gcloud secrets create gemini-api-key \
  --data-file=- \
  --replication-policy="automatic"

echo -n "your-webhook-secret" | gcloud secrets create webhook-secret \
  --data-file=- \
  --replication-policy="automatic"

# Grant access to service account
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:autocut-runner@autocut-prod.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Monitoring

### Setup Monitoring Dashboard

```bash
# Create custom dashboard
gcloud monitoring dashboards create --config-from-file=monitoring/dashboard.yaml
```

### Configure Alerts

```yaml
# monitoring/alerts.yaml
displayName: "API High Latency"
conditions:
  - displayName: "API latency above 1s"
    conditionThreshold:
      filter: |
        resource.type="cloud_run_revision"
        resource.labels.service_name="autocut-api"
        metric.type="run.googleapis.com/request_latencies"
      comparison: COMPARISON_GT
      thresholdValue: 1000
      duration: 300s

notificationChannels:
  - projects/autocut-prod/notificationChannels/12345
```

### Setup Uptime Checks

```bash
gcloud monitoring uptime-checks create https \
  --display-name="AutoCut API Health" \
  --uri="https://api.autocut.app/health" \
  --check-interval=60
```

## Production Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Security scan completed
- [ ] Performance testing done
- [ ] Database migrations ready
- [ ] Rollback plan prepared

### Configuration
- [ ] Environment variables set
- [ ] Secrets configured
- [ ] CORS policies updated
- [ ] Domain verified
- [ ] SSL certificates active

### Monitoring
- [ ] Logging enabled
- [ ] Alerts configured
- [ ] Dashboard created
- [ ] Uptime checks active
- [ ] Error reporting enabled

### Security
- [ ] IAM roles configured
- [ ] Service accounts limited
- [ ] API keys rotated
- [ ] Firewall rules set
- [ ] DDoS protection enabled

## Troubleshooting

### Common Issues

#### 1. Cloud Run Deploy Fails
```bash
# Check build logs
gcloud builds list --limit=5

# View detailed build log
gcloud builds log BUILD_ID

# Common fixes:
# - Check Dockerfile syntax
# - Verify all dependencies
# - Ensure port 8080 is exposed
```

#### 2. Firebase Deploy Fails
```bash
# Debug Firebase deployment
firebase deploy --debug

# Common fixes:
# - Check firebase.json configuration
# - Verify authentication
# - Clear cache: rm -rf .firebase
```

#### 3. Firestore Permission Errors
```bash
# Check Firestore rules
firebase deploy --only firestore:rules

# Test rules in Firebase Console
# Common fixes:
# - Update security rules
# - Check service account permissions
```

#### 4. Video Processing Timeout
```bash
# Increase Cloud Run timeout
gcloud run services update autocut-processor \
  --timeout=3600

# Increase memory
gcloud run services update autocut-processor \
  --memory=8Gi
```

### Debug Commands

```bash
# View Cloud Run logs
gcloud run services logs read autocut-api --limit=50

# Stream logs
gcloud alpha run services logs tail autocut-api

# SSH into Cloud Run (for debugging)
gcloud run services describe autocut-api \
  --format="value(status.url)"

# Check service health
curl https://api.autocut.app/health

# View Firestore indexes
gcloud firestore indexes list

# Check Cloud Tasks queue
gcloud tasks queues describe video-processing \
  --location=us-central1
```

## Rollback Procedures

### Quick Rollback

```bash
# Rollback Cloud Run to previous revision
gcloud run services update-traffic autocut-api \
  --to-revisions=autocut-api-00001=100

# Rollback Firebase Hosting
firebase hosting:releases:list
firebase hosting:rollback
```

### Database Rollback

```bash
# Restore Firestore backup
gcloud firestore import gs://autocut-backups/2024-01-15

# Point-in-time recovery (if enabled)
gcloud firestore databases restore \
  --source-database=autocut-prod \
  --destination-database=autocut-prod-restored \
  --snapshot-time=2024-01-15T10:00:00Z
```

## Cost Optimization

### Recommendations
1. **Use Cloud Run minimum instances = 0** for dev/staging
2. **Set lifecycle policies** on Cloud Storage
3. **Use Firestore TTL** for temporary data
4. **Enable Cloud CDN** for static assets
5. **Use committed use discounts** for production

### Cost Monitoring

```bash
# Set budget alert
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="AutoCut Monthly Budget" \
  --budget-amount=1000 \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100
```

## Support

For deployment support:
- Documentation: https://docs.autocut.app
- Email: devops@autocut.app
- Slack: #autocut-deployment