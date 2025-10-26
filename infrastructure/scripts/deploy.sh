#!/bin/bash

# AutoCut Deployment Script
# Deploy all services to Google Cloud Platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-"production"}
PROJECT_ID=${PROJECT_ID:-"autocut-prod"}
REGION=${REGION:-"us-central1"}
SERVICE_ACCOUNT="autocut-cloud-run@${PROJECT_ID}.iam.gserviceaccount.com"

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}         AutoCut Deployment Script                ${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""
echo -e "Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "Project ID: ${YELLOW}$PROJECT_ID${NC}"
echo -e "Region: ${YELLOW}$REGION${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    exit 1
fi

if ! command -v firebase &> /dev/null; then
    echo -e "${RED}Error: Firebase CLI is not installed${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Check if logged in
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo -e "${RED}Error: Not logged in to gcloud${NC}"
    echo "Run: gcloud auth login"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites met${NC}"

# Set project
gcloud config set project $PROJECT_ID

# Build and deploy backend API
echo ""
echo -e "${YELLOW}Deploying API Service...${NC}"

cd backend/api

# Build Docker image
docker build -t gcr.io/$PROJECT_ID/autocut-api:$ENVIRONMENT .

# Push to Container Registry
docker push gcr.io/$PROJECT_ID/autocut-api:$ENVIRONMENT

# Deploy to Cloud Run
gcloud run deploy autocut-api \
  --image gcr.io/$PROJECT_ID/autocut-api:$ENVIRONMENT \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --service-account $SERVICE_ACCOUNT \
  --set-env-vars "ENVIRONMENT=$ENVIRONMENT" \
  --set-env-vars "GCP_PROJECT=$PROJECT_ID" \
  --set-secrets "GEMINI_API_KEY=gemini-api-key:latest" \
  --memory 1Gi \
  --cpu 2 \
  --min-instances 1 \
  --max-instances 100 \
  --timeout 300

API_URL=$(gcloud run services describe autocut-api --region=$REGION --format='value(status.url)')
echo -e "${GREEN}✓ API deployed at: $API_URL${NC}"

# Build and deploy video processor
echo ""
echo -e "${YELLOW}Deploying Video Processor Service...${NC}"

cd ../processor

# Build Docker image
docker build -t gcr.io/$PROJECT_ID/autocut-processor:$ENVIRONMENT .

# Push to Container Registry
docker push gcr.io/$PROJECT_ID/autocut-processor:$ENVIRONMENT

# Deploy to Cloud Run
gcloud run deploy autocut-processor \
  --image gcr.io/$PROJECT_ID/autocut-processor:$ENVIRONMENT \
  --platform managed \
  --region $REGION \
  --no-allow-unauthenticated \
  --service-account $SERVICE_ACCOUNT \
  --set-env-vars "ENVIRONMENT=$ENVIRONMENT" \
  --set-env-vars "GCP_PROJECT=$PROJECT_ID" \
  --memory 4Gi \
  --cpu 4 \
  --min-instances 0 \
  --max-instances 50 \
  --timeout 3600

PROCESSOR_URL=$(gcloud run services describe autocut-processor --region=$REGION --format='value(status.url)')
echo -e "${GREEN}✓ Processor deployed at: $PROCESSOR_URL${NC}"

# Deploy frontend to Firebase
echo ""
echo -e "${YELLOW}Deploying Frontend to Firebase...${NC}"

cd ../../frontend

# Create .env.production with API URLs
cat > .env.production <<EOF
NEXT_PUBLIC_API_URL=$API_URL
NEXT_PUBLIC_WS_URL=${API_URL/https/wss}
NEXT_PUBLIC_FIREBASE_API_KEY=$FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$PROJECT_ID.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=$PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$PROJECT_ID.appspot.com
NEXT_PUBLIC_ENVIRONMENT=$ENVIRONMENT
EOF

# Build frontend
npm ci
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting --project $PROJECT_ID

FRONTEND_URL="https://$PROJECT_ID.web.app"
echo -e "${GREEN}✓ Frontend deployed at: $FRONTEND_URL${NC}"

# Deploy Firestore rules and indexes
echo ""
echo -e "${YELLOW}Deploying Firestore configuration...${NC}"

cd ..
firebase deploy --only firestore --project $PROJECT_ID
echo -e "${GREEN}✓ Firestore rules and indexes deployed${NC}"

# Update Cloud Tasks to point to new services
echo ""
echo -e "${YELLOW}Updating Cloud Tasks configuration...${NC}"

# Grant Cloud Tasks permission to invoke the processor
gcloud run services add-iam-policy-binding autocut-processor \
  --location=$REGION \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/run.invoker"

echo -e "${GREEN}✓ Cloud Tasks configured${NC}"

# Set up monitoring
echo ""
echo -e "${YELLOW}Setting up monitoring...${NC}"

# Create uptime checks
gcloud monitoring uptime-checks create https autocut-api-health \
  --display-name="AutoCut API Health Check" \
  --uri="$API_URL/health" \
  --check-interval=60 \
  2>/dev/null || echo "Uptime check already exists"

echo -e "${GREEN}✓ Monitoring configured${NC}"

# Run smoke tests
echo ""
echo -e "${YELLOW}Running smoke tests...${NC}"

# Test API health endpoint
if curl -s "$API_URL/health" | grep -q "healthy"; then
    echo -e "${GREEN}✓ API health check passed${NC}"
else
    echo -e "${RED}✗ API health check failed${NC}"
fi

# Test frontend
if curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" | grep -q "200"; then
    echo -e "${GREEN}✓ Frontend is accessible${NC}"
else
    echo -e "${RED}✗ Frontend is not accessible${NC}"
fi

# Deployment summary
echo ""
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}         Deployment Complete!                     ${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""
echo -e "Frontend URL: ${BLUE}$FRONTEND_URL${NC}"
echo -e "API URL: ${BLUE}$API_URL${NC}"
echo -e "Processor URL: ${BLUE}$PROCESSOR_URL${NC}"
echo ""
echo "Next steps:"
echo "1. Test the application at $FRONTEND_URL"
echo "2. Monitor logs: gcloud run logs read --service=autocut-api"
echo "3. View metrics in Cloud Console"
echo ""

# Save deployment info
cat > deployment-info.txt <<EOF
Deployment Information
======================
Date: $(date)
Environment: $ENVIRONMENT
Project ID: $PROJECT_ID
Region: $REGION

URLs:
- Frontend: $FRONTEND_URL
- API: $API_URL
- Processor: $PROCESSOR_URL

Commands:
- View API logs: gcloud run logs read --service=autocut-api
- View processor logs: gcloud run logs read --service=autocut-processor
- SSH to Cloud Shell: gcloud cloud-shell ssh
- Update API: gcloud run deploy autocut-api --source .
EOF

echo -e "${YELLOW}Deployment information saved to deployment-info.txt${NC}"