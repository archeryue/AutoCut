# Google Cloud Platform Setup Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Project Setup](#project-setup)
- [Service Configuration](#service-configuration)
- [Security Setup](#security-setup)
- [Cost Management](#cost-management)
- [Monitoring Setup](#monitoring-setup)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Access
- Google account with billing enabled
- Organization admin access (for enterprise)
- Credit card for billing setup

### Required Tools
```bash
# Install Google Cloud SDK
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Verify installation
gcloud version

# Install additional components
gcloud components install beta
gcloud components install cloud-firestore-emulator
```

## Project Setup

### Step 1: Create GCP Project

```bash
# Set variables
export PROJECT_ID="autocut-prod"
export PROJECT_NAME="AutoCut Production"
export BILLING_ACCOUNT_ID="YOUR_BILLING_ACCOUNT_ID"
export REGION="us-central1"
export ZONE="us-central1-a"

# Create project
gcloud projects create $PROJECT_ID \
  --name="$PROJECT_NAME" \
  --organization=YOUR_ORG_ID  # Optional

# Set default project
gcloud config set project $PROJECT_ID

# Link billing account
gcloud beta billing projects link $PROJECT_ID \
  --billing-account=$BILLING_ACCOUNT_ID
```

### Step 2: Enable Required APIs

```bash
# Enable all required APIs
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
  artifactregistry.googleapis.com \
  redis.googleapis.com \
  vpcaccess.googleapis.com \
  servicenetworking.googleapis.com

# Verify APIs are enabled
gcloud services list --enabled
```

### Step 3: Set Default Configuration

```bash
# Set default region and zone
gcloud config set compute/region $REGION
gcloud config set compute/zone $ZONE
gcloud config set run/region $REGION

# Set default project properties
gcloud config configurations create autocut-prod
gcloud config set project $PROJECT_ID
gcloud config set account your-email@domain.com
```

## Service Configuration

### Firebase Setup

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase project
firebase projects:addfirebase $PROJECT_ID

# Initialize Firebase services
firebase init

# Select:
# ✓ Firestore
# ✓ Functions
# ✓ Hosting
# ✓ Storage
# ✓ Emulators

# Configure Firestore
echo "Setting up Firestore..."
gcloud firestore databases create \
  --region=$REGION \
  --type=firestore-native

# Configure Firebase Hosting
firebase target:apply hosting prod autocut-prod
```

#### Firestore Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Projects belong to users
    match /projects/{projectId} {
      allow read, write: if request.auth != null &&
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.userId;
    }

    // Media files belong to projects
    match /media/{mediaId} {
      allow read, write: if request.auth != null &&
        exists(/databases/$(database)/documents/projects/$(resource.data.projectId)) &&
        get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.userId == request.auth.uid;
    }

    // Chat messages belong to projects
    match /chats/{chatId} {
      allow read, write: if request.auth != null &&
        exists(/databases/$(database)/documents/projects/$(resource.data.projectId)) &&
        get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.userId == request.auth.uid;
    }
  }
}
```

### Cloud Storage Setup

```bash
# Create storage buckets
gsutil mb -p $PROJECT_ID -c standard -l $REGION gs://autocut-media-prod
gsutil mb -p $PROJECT_ID -c standard -l $REGION gs://autocut-renders-prod
gsutil mb -p $PROJECT_ID -c nearline -l $REGION gs://autocut-backups-prod

# Set CORS configuration
cat > cors.json <<EOF
[
  {
    "origin": ["https://autocut.app", "https://www.autocut.app"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "responseHeader": ["*"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors.json gs://autocut-media-prod
gsutil cors set cors.json gs://autocut-renders-prod

# Set lifecycle policies
cat > lifecycle.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 30,
          "matchesPrefix": ["temp/"]
        }
      },
      {
        "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
        "condition": {
          "age": 7,
          "matchesPrefix": ["renders/"]
        }
      },
      {
        "action": {"type": "SetStorageClass", "storageClass": "ARCHIVE"},
        "condition": {
          "age": 90,
          "matchesPrefix": ["renders/"]
        }
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle.json gs://autocut-media-prod
gsutil lifecycle set lifecycle.json gs://autocut-renders-prod

# Set up versioning for backups
gsutil versioning set on gs://autocut-backups-prod

# Set public access prevention
gsutil pap set enforced gs://autocut-media-prod
gsutil pap set enforced gs://autocut-renders-prod
```

### Cloud Run Configuration

```bash
# Create service account for Cloud Run
gcloud iam service-accounts create autocut-cloud-run \
  --display-name="AutoCut Cloud Run Service Account"

# Set service account email variable
export SERVICE_ACCOUNT="autocut-cloud-run@${PROJECT_ID}.iam.gserviceaccount.com"

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudtasks.enqueuer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/aiplatform.user"

# Create Artifact Registry for Docker images
gcloud artifacts repositories create autocut-docker \
  --repository-format=docker \
  --location=$REGION \
  --description="Docker repository for AutoCut"
```

### Vertex AI & Gemini Setup

```bash
# Enable Vertex AI
gcloud services enable aiplatform.googleapis.com

# Create Vertex AI service account
gcloud iam service-accounts create vertex-ai-sa \
  --display-name="Vertex AI Service Account"

# Grant permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:vertex-ai-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Get Gemini API key (if using API key method)
# Visit: https://makersuite.google.com/app/apikey
# Store in Secret Manager:
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create gemini-api-key \
  --data-file=- \
  --replication-policy="automatic"

# Grant Cloud Run access to secret
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

### Cloud Tasks Setup

```bash
# Create task queues
gcloud tasks queues create video-processing \
  --location=$REGION \
  --max-concurrent-dispatches=10 \
  --max-dispatches-per-second=5 \
  --max-attempts=3 \
  --min-backoff=10s \
  --max-backoff=300s

gcloud tasks queues create media-analysis \
  --location=$REGION \
  --max-concurrent-dispatches=20 \
  --max-dispatches-per-second=10 \
  --max-attempts=3 \
  --min-backoff=5s \
  --max-backoff=60s

# Grant Cloud Tasks permission to invoke Cloud Run
gcloud run services add-iam-policy-binding autocut-processor \
  --location=$REGION \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/run.invoker"
```

### Transcoder API Setup

```bash
# Enable Transcoder API
gcloud services enable transcoder.googleapis.com

# Create job template
cat > transcoder-template.json <<EOF
{
  "config": {
    "inputs": [
      {
        "key": "input0"
      }
    ],
    "editList": [
      {
        "key": "edit0",
        "inputs": ["input0"],
        "startTimeOffset": "0s"
      }
    ],
    "elementaryStreams": [
      {
        "key": "video-stream0",
        "videoStream": {
          "h264": {
            "heightPixels": 1080,
            "widthPixels": 1920,
            "bitrateBps": 5000000,
            "frameRate": 30,
            "gopDuration": "2s",
            "profile": "high",
            "preset": "veryfast"
          }
        }
      },
      {
        "key": "audio-stream0",
        "audioStream": {
          "codec": "aac",
          "bitrateBps": 128000,
          "sampleRateHertz": 48000,
          "channelCount": 2
        }
      }
    ],
    "muxStreams": [
      {
        "key": "mux0",
        "container": "mp4",
        "elementaryStreams": ["video-stream0", "audio-stream0"]
      }
    ],
    "manifests": [],
    "output": {}
  }
}
EOF

# Create job template
gcloud transcoder templates create autocut-1080p \
  --location=$REGION \
  --file=transcoder-template.json
```

### VPC and Networking (Optional for Production)

```bash
# Create VPC network
gcloud compute networks create autocut-network \
  --subnet-mode=custom \
  --bgp-routing-mode=regional

# Create subnet
gcloud compute networks subnets create autocut-subnet \
  --network=autocut-network \
  --region=$REGION \
  --range=10.0.0.0/24

# Create serverless VPC connector
gcloud compute networks vpc-access connectors create autocut-connector \
  --network=autocut-network \
  --region=$REGION \
  --subnet=autocut-subnet \
  --min-instances=2 \
  --max-instances=10

# Configure Cloud Run to use VPC connector
gcloud run services update autocut-api \
  --vpc-connector=autocut-connector \
  --vpc-egress=all-traffic
```

## Security Setup

### Identity and Access Management (IAM)

```bash
# Create custom roles
cat > api-role.yaml <<EOF
title: "AutoCut API Role"
description: "Custom role for AutoCut API service"
stage: "GA"
includedPermissions:
- firestore.databases.get
- firestore.documents.create
- firestore.documents.delete
- firestore.documents.get
- firestore.documents.list
- firestore.documents.update
- storage.buckets.get
- storage.objects.create
- storage.objects.delete
- storage.objects.get
- storage.objects.list
- cloudtasks.tasks.create
- secretmanager.versions.access
EOF

gcloud iam roles create autocutApiRole \
  --project=$PROJECT_ID \
  --file=api-role.yaml

# Assign custom role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="projects/${PROJECT_ID}/roles/autocutApiRole"
```

### Secret Management

```bash
# Create secrets
echo -n "your-database-password" | gcloud secrets create db-password --data-file=-
echo -n "your-api-key" | gcloud secrets create api-key --data-file=-
echo -n "your-webhook-secret" | gcloud secrets create webhook-secret --data-file=-

# List secrets
gcloud secrets list

# Update a secret
echo -n "new-password" | gcloud secrets versions add db-password --data-file=-

# Access secret in Cloud Run
gcloud run services update autocut-api \
  --set-secrets="DB_PASSWORD=db-password:latest"
```

### Security Best Practices

```bash
# Enable audit logging
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/logging.logWriter"

# Enable VPC Service Controls (for enterprise)
gcloud access-context-manager perimeters create autocut-perimeter \
  --resources=projects/${PROJECT_NUMBER} \
  --restricted-services=storage.googleapis.com,firestore.googleapis.com

# Configure Binary Authorization (optional)
gcloud container binauthz policy import policy.yaml \
  --project=$PROJECT_ID

# Enable Cloud Armor for DDoS protection
gcloud compute backend-services update autocut-backend \
  --security-policy=autocut-security-policy
```

## Cost Management

### Set Budget Alerts

```bash
# Create budget with alerts
gcloud billing budgets create \
  --billing-account=$BILLING_ACCOUNT_ID \
  --display-name="AutoCut Monthly Budget" \
  --budget-amount=1000USD \
  --threshold-rule=percent=50,basis=current-spend \
  --threshold-rule=percent=75,basis=current-spend \
  --threshold-rule=percent=90,basis=current-spend \
  --threshold-rule=percent=100,basis=current-spend \
  --notification-channel-from-email=billing@autocut.app

# Set up cost allocation labels
gcloud run services update autocut-api \
  --update-labels=env=production,team=backend,cost-center=engineering

gcloud compute instances update autocut-instance \
  --update-labels=env=production,team=infrastructure
```

### Resource Quotas

```bash
# Set quotas for Cloud Run
gcloud run services update autocut-api \
  --max-instances=50 \
  --concurrency=100 \
  --cpu=2 \
  --memory=2Gi

# Set quotas for Cloud Storage
gsutil defstorageclass set STANDARD gs://autocut-media-prod
gsutil lifecycle set lifecycle.json gs://autocut-media-prod
```

### Cost Optimization Tips

```bash
# Use committed use discounts
gcloud compute commitments create commitment-1 \
  --plan=TWELVE_MONTH \
  --resources=vcpu=100,memory=400

# Enable autoscaling
gcloud run services update autocut-api \
  --min-instances=0 \
  --max-instances=100

# Use Spot VMs for batch processing
gcloud compute instances create autocut-batch \
  --preemptible \
  --machine-type=n1-standard-4
```

## Monitoring Setup

### Cloud Monitoring Dashboard

```bash
# Create dashboard
cat > dashboard.json <<EOF
{
  "displayName": "AutoCut Dashboard",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Cloud Run Request Rate",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\"",
                    "aggregation": {
                      "alignmentPeriod": "60s",
                      "perSeriesAligner": "ALIGN_RATE"
                    }
                  }
                }
              }
            ]
          }
        }
      }
    ]
  }
}
EOF

gcloud monitoring dashboards create --config-from-file=dashboard.json
```

### Alerting Policies

```bash
# Create alert for high error rate
cat > alert-policy.json <<EOF
{
  "displayName": "High Error Rate",
  "conditions": [
    {
      "displayName": "Error rate above 1%",
      "conditionThreshold": {
        "filter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 0.01,
        "duration": "60s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_RATE"
          }
        ]
      }
    }
  ],
  "notificationChannels": [],
  "alertStrategy": {
    "autoClose": "604800s"
  }
}
EOF

gcloud alpha monitoring policies create --policy-from-file=alert-policy.json
```

### Uptime Checks

```bash
# Create uptime check
gcloud monitoring uptime create https autocut-api-health \
  --display-name="AutoCut API Health Check" \
  --uri="https://api.autocut.app/health" \
  --check-interval=60
```

### Logging Configuration

```bash
# Create log sink for long-term storage
gcloud logging sinks create autocut-archive \
  storage.googleapis.com/autocut-logs-archive \
  --log-filter='severity>=WARNING'

# Create log-based metrics
gcloud logging metrics create error_count \
  --description="Count of errors" \
  --value-extractor='EXTRACT(jsonPayload.error)' \
  --metric-kind=DELTA \
  --value-type=INT64
```

## Troubleshooting

### Common Issues and Solutions

#### 1. API Enablement Issues
```bash
# Check if APIs are enabled
gcloud services list --enabled | grep -E "run|firestore|storage"

# Enable missing APIs
gcloud services enable missing-api.googleapis.com
```

#### 2. Permission Errors
```bash
# Check IAM roles
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${SERVICE_ACCOUNT}"

# Add missing permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/required.role"
```

#### 3. Quota Exceeded
```bash
# Check quotas
gcloud compute project-info describe --project=$PROJECT_ID

# Request quota increase
gcloud compute quotas request --location=$REGION --metric=CPUS --quota=1000
```

#### 4. Network Issues
```bash
# Test connectivity
gcloud compute ssh test-instance --command="curl https://api.autocut.app/health"

# Check firewall rules
gcloud compute firewall-rules list

# Create firewall rule if needed
gcloud compute firewall-rules create allow-autocut \
  --network=autocut-network \
  --allow=tcp:443,tcp:80 \
  --source-ranges=0.0.0.0/0
```

### Debug Commands

```bash
# View project configuration
gcloud config list

# Check service status
gcloud run services describe autocut-api --region=$REGION

# View recent errors
gcloud logging read "severity=ERROR" --limit=50 --format=json

# Check billing status
gcloud billing accounts list
gcloud billing projects describe $PROJECT_ID

# Test API endpoints
curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  https://api.autocut.app/health

# SSH into Compute Engine instance (if applicable)
gcloud compute ssh instance-name --zone=$ZONE
```

## Cleanup

```bash
# Delete the entire project (WARNING: This deletes everything!)
gcloud projects delete $PROJECT_ID

# Or delete individual resources
gcloud run services delete autocut-api --region=$REGION
gsutil rm -r gs://autocut-media-prod
gcloud firestore databases delete --database=(default)
```

## Additional Resources

- [Google Cloud Console](https://console.cloud.google.com)
- [GCP Documentation](https://cloud.google.com/docs)
- [GCP Pricing Calculator](https://cloud.google.com/products/calculator)
- [GCP Status](https://status.cloud.google.com)
- [GCP Support](https://cloud.google.com/support)

## Support

For GCP-specific support:
- Email: gcp-support@autocut.app
- Slack: #autocut-infrastructure
- GCP Support Ticket: Via Google Cloud Console