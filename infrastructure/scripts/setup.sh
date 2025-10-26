#!/bin/bash

# AutoCut GCP Setup Script
# This script sets up the GCP environment for AutoCut

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=${PROJECT_ID:-"autocut-prod"}
REGION=${REGION:-"us-central1"}
ZONE=${ZONE:-"us-central1-a"}

echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}       AutoCut GCP Environment Setup              ${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Please install the Google Cloud SDK: https://cloud.google.com/sdk/install"
    exit 1
fi

if ! command -v firebase &> /dev/null; then
    echo -e "${RED}Error: Firebase CLI is not installed${NC}"
    echo "Please install Firebase CLI: npm install -g firebase-tools"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites met${NC}"
echo ""

# Create or select project
echo -e "${YELLOW}Setting up GCP project...${NC}"
if gcloud projects describe $PROJECT_ID &> /dev/null; then
    echo -e "${GREEN}✓ Project $PROJECT_ID exists${NC}"
    gcloud config set project $PROJECT_ID
else
    echo "Creating new project: $PROJECT_ID"
    gcloud projects create $PROJECT_ID --name="AutoCut Production"
    gcloud config set project $PROJECT_ID
    echo -e "${GREEN}✓ Project created${NC}"
fi

# Set default configuration
echo -e "${YELLOW}Setting default configuration...${NC}"
gcloud config set compute/region $REGION
gcloud config set compute/zone $ZONE
gcloud config set run/region $REGION
echo -e "${GREEN}✓ Default configuration set${NC}"

# Enable APIs
echo -e "${YELLOW}Enabling required APIs...${NC}"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  firestore.googleapis.com \
  firebase.googleapis.com \
  storage-component.googleapis.com \
  storage-api.googleapis.com \
  transcoder.googleapis.com \
  cloudtasks.googleapis.com \
  secretmanager.googleapis.com \
  aiplatform.googleapis.com \
  monitoring.googleapis.com \
  logging.googleapis.com \
  cloudtrace.googleapis.com \
  clouderrorreporting.googleapis.com \
  compute.googleapis.com \
  dns.googleapis.com \
  certificatemanager.googleapis.com \
  artifactregistry.googleapis.com

echo -e "${GREEN}✓ APIs enabled${NC}"

# Create service accounts
echo -e "${YELLOW}Creating service accounts...${NC}"
SERVICE_ACCOUNT="autocut-cloud-run@${PROJECT_ID}.iam.gserviceaccount.com"

if gcloud iam service-accounts describe $SERVICE_ACCOUNT &> /dev/null; then
    echo -e "${GREEN}✓ Service account exists${NC}"
else
    gcloud iam service-accounts create autocut-cloud-run \
      --display-name="AutoCut Cloud Run Service Account"
    echo -e "${GREEN}✓ Service account created${NC}"
fi

# Grant IAM roles
echo -e "${YELLOW}Configuring IAM permissions...${NC}"
ROLES=(
  "roles/datastore.user"
  "roles/storage.admin"
  "roles/cloudtasks.enqueuer"
  "roles/secretmanager.secretAccessor"
  "roles/aiplatform.user"
  "roles/logging.logWriter"
  "roles/cloudtrace.agent"
)

for ROLE in "${ROLES[@]}"; do
    gcloud projects add-iam-policy-binding $PROJECT_ID \
      --member="serviceAccount:${SERVICE_ACCOUNT}" \
      --role="$ROLE" \
      --quiet
done
echo -e "${GREEN}✓ IAM permissions configured${NC}"

# Create Cloud Storage buckets
echo -e "${YELLOW}Creating Cloud Storage buckets...${NC}"
BUCKETS=(
  "autocut-media-prod"
  "autocut-renders-prod"
  "autocut-backups-prod"
  "autocut-logs-archive"
)

for BUCKET in "${BUCKETS[@]}"; do
    if gsutil ls -b gs://$BUCKET &> /dev/null; then
        echo -e "${GREEN}✓ Bucket $BUCKET exists${NC}"
    else
        gsutil mb -p $PROJECT_ID -c standard -l $REGION gs://$BUCKET
        echo -e "${GREEN}✓ Bucket $BUCKET created${NC}"
    fi
done

# Set CORS for media buckets
echo -e "${YELLOW}Configuring CORS...${NC}"
cat > /tmp/cors.json <<EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "responseHeader": ["*"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set /tmp/cors.json gs://autocut-media-prod
gsutil cors set /tmp/cors.json gs://autocut-renders-prod
echo -e "${GREEN}✓ CORS configured${NC}"

# Create Firestore database
echo -e "${YELLOW}Setting up Firestore...${NC}"
if gcloud firestore databases describe --database="(default)" &> /dev/null; then
    echo -e "${GREEN}✓ Firestore database exists${NC}"
else
    gcloud firestore databases create --region=$REGION --type=firestore-native
    echo -e "${GREEN}✓ Firestore database created${NC}"
fi

# Create Cloud Tasks queues
echo -e "${YELLOW}Creating Cloud Tasks queues...${NC}"
QUEUES=(
  "video-processing"
  "media-analysis"
)

for QUEUE in "${QUEUES[@]}"; do
    if gcloud tasks queues describe $QUEUE --location=$REGION &> /dev/null; then
        echo -e "${GREEN}✓ Queue $QUEUE exists${NC}"
    else
        gcloud tasks queues create $QUEUE \
          --location=$REGION \
          --max-concurrent-dispatches=10 \
          --max-attempts=3 \
          --min-backoff=10s \
          --max-backoff=300s
        echo -e "${GREEN}✓ Queue $QUEUE created${NC}"
    fi
done

# Create Artifact Registry
echo -e "${YELLOW}Creating Artifact Registry...${NC}"
if gcloud artifacts repositories describe autocut-docker --location=$REGION &> /dev/null; then
    echo -e "${GREEN}✓ Artifact Registry exists${NC}"
else
    gcloud artifacts repositories create autocut-docker \
      --repository-format=docker \
      --location=$REGION \
      --description="Docker repository for AutoCut"
    echo -e "${GREEN}✓ Artifact Registry created${NC}"
fi

# Initialize Firebase
echo -e "${YELLOW}Initializing Firebase...${NC}"
firebase projects:addfirebase $PROJECT_ID 2>/dev/null || true
echo -e "${GREEN}✓ Firebase initialized${NC}"

# Create environment file template
echo -e "${YELLOW}Creating environment file template...${NC}"
cat > .env.template <<EOF
# GCP Configuration
GCP_PROJECT=$PROJECT_ID
REGION=$REGION
ZONE=$ZONE

# Service Account
SERVICE_ACCOUNT=$SERVICE_ACCOUNT

# Storage Buckets
MEDIA_BUCKET=autocut-media-prod
RENDER_BUCKET=autocut-renders-prod
BACKUP_BUCKET=autocut-backups-prod

# API Keys (add your keys here)
GEMINI_API_KEY=your-gemini-api-key-here

# Firebase Config (get from Firebase Console)
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=$PROJECT_ID
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
EOF

echo -e "${GREEN}✓ Environment template created (.env.template)${NC}"

# Summary
echo ""
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}           Setup Complete!                        ${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""
echo "Next steps:"
echo "1. Copy .env.template to .env and fill in the API keys"
echo "2. Configure Firebase Authentication in the Firebase Console"
echo "3. Deploy the application using ./deploy.sh"
echo ""
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Service Account: $SERVICE_ACCOUNT"
echo ""
echo -e "${YELLOW}Important: Don't forget to set up billing for your project!${NC}"
echo "Visit: https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"