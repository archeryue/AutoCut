# AutoCut API Documentation

## Base URL

```
Production: https://api.autocut.app
Staging: https://staging-api.autocut.app
Local: http://localhost:8000
```

## Authentication

All API requests require authentication using Firebase ID tokens.

```http
Authorization: Bearer <firebase_id_token>
```

### Getting an ID Token

```javascript
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const token = await auth.currentUser.getIdToken();
```

## API Endpoints

### Projects

#### Create Project

```http
POST /api/projects
```

**Request Body:**
```json
{
  "title": "My Travel Vlog",
  "description": "Summer vacation in Bali",
  "type": "travel"
}
```

**Response:**
```json
{
  "projectId": "proj_abc123",
  "title": "My Travel Vlog",
  "description": "Summer vacation in Bali",
  "type": "travel",
  "status": "created",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

#### Get Project

```http
GET /api/projects/{projectId}
```

**Response:**
```json
{
  "projectId": "proj_abc123",
  "title": "My Travel Vlog",
  "status": "analyzing",
  "media": [
    {
      "fileId": "file_xyz789",
      "filename": "beach.mp4",
      "type": "video",
      "duration": 120,
      "size": 52428800,
      "gcsUrl": "gs://autocut-media/..."
    }
  ],
  "analysis": {
    "scenes": [...],
    "suggestedNarrative": "..."
  },
  "plan": {
    "timeline": [...],
    "settings": {...}
  }
}
```

#### Update Project

```http
PUT /api/projects/{projectId}
```

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description"
}
```

#### Delete Project

```http
DELETE /api/projects/{projectId}
```

#### List User Projects

```http
GET /api/projects?page=1&limit=10&status=complete
```

**Query Parameters:**
- `page` (optional): Page number for pagination
- `limit` (optional): Number of items per page (max 100)
- `status` (optional): Filter by status

### Media Upload

#### Initialize Upload

```http
POST /api/upload/initiate
```

**Request Body:**
```json
{
  "projectId": "proj_abc123",
  "files": [
    {
      "filename": "video1.mp4",
      "size": 52428800,
      "type": "video/mp4"
    },
    {
      "filename": "photo1.jpg",
      "size": 2097152,
      "type": "image/jpeg"
    }
  ]
}
```

**Response:**
```json
{
  "uploadUrls": [
    {
      "filename": "video1.mp4",
      "uploadUrl": "https://storage.googleapis.com/...",
      "fileId": "file_123"
    },
    {
      "filename": "photo1.jpg",
      "uploadUrl": "https://storage.googleapis.com/...",
      "fileId": "file_456"
    }
  ]
}
```

#### Complete Upload

```http
POST /api/upload/complete
```

**Request Body:**
```json
{
  "projectId": "proj_abc123",
  "fileIds": ["file_123", "file_456"]
}
```

### AI Analysis

#### Trigger Analysis

```http
POST /api/analyze
```

**Request Body:**
```json
{
  "projectId": "proj_abc123",
  "options": {
    "detectScenes": true,
    "extractAudio": true,
    "identifyObjects": true,
    "analyzeMood": true
  }
}
```

**Response:**
```json
{
  "analysisId": "analysis_789",
  "status": "processing",
  "estimatedTime": 120
}
```

#### Get Analysis Status

```http
GET /api/analysis/{analysisId}
```

**Response:**
```json
{
  "analysisId": "analysis_789",
  "status": "complete",
  "results": {
    "scenes": [
      {
        "id": "scene_001",
        "description": "Beach sunset with palm trees",
        "startTime": 0,
        "endTime": 10,
        "mood": "peaceful",
        "objects": ["beach", "sunset", "palm trees"],
        "location": "Bali, Indonesia",
        "quality": 0.95
      }
    ],
    "suggestedNarrative": "Your journey begins at the beautiful beaches of Bali...",
    "musicRecommendations": [
      {
        "genre": "tropical house",
        "mood": "upbeat",
        "energy": 0.7
      }
    ],
    "highlights": [
      {
        "timestamp": 45,
        "description": "Spectacular sunset view",
        "importance": 0.9
      }
    ]
  }
}
```

### Plan Generation

#### Generate Plan

```http
POST /api/plan/generate
```

**Request Body:**
```json
{
  "projectId": "proj_abc123",
  "preferences": {
    "duration": 180,
    "style": "cinematic",
    "musicGenre": "electronic",
    "includeIntro": true,
    "includeOutro": true
  }
}
```

**Response:**
```json
{
  "planId": "plan_456",
  "timeline": [
    {
      "id": "clip_001",
      "type": "clip",
      "sourceFileId": "file_123",
      "startTime": 0,
      "duration": 5,
      "sourceStart": 10,
      "sourceEnd": 15,
      "effects": {
        "fadeIn": true,
        "colorGrading": "warm"
      }
    },
    {
      "id": "trans_001",
      "type": "transition",
      "style": "crossfade",
      "duration": 1
    },
    {
      "id": "text_001",
      "type": "text",
      "content": "Bali 2024",
      "style": "title",
      "startTime": 2,
      "duration": 3,
      "position": "center"
    }
  ],
  "settings": {
    "totalDuration": 180,
    "aspectRatio": "16:9",
    "resolution": "1080p",
    "fps": 30
  }
}
```

#### Update Plan

```http
PUT /api/plan/{planId}
```

**Request Body:**
```json
{
  "timeline": [...],
  "settings": {...}
}
```

### Chat Modifications

#### Send Chat Message

```http
POST /api/plan/{planId}/chat
```

**Request Body:**
```json
{
  "message": "Make the intro shorter and add more beach scenes"
}
```

**Response:**
```json
{
  "messageId": "msg_789",
  "interpretation": {
    "actions": [
      {
        "type": "modify_duration",
        "target": "intro",
        "value": 3
      },
      {
        "type": "add_clips",
        "filter": "beach",
        "count": 2
      }
    ]
  },
  "updatedPlan": {
    "timeline": [...],
    "changes": [
      "Shortened intro from 5s to 3s",
      "Added 2 beach scenes at 1:30 and 2:45"
    ]
  }
}
```

#### Get Chat History

```http
GET /api/plan/{planId}/chat/history
```

### Video Rendering

#### Start Render

```http
POST /api/render
```

**Request Body:**
```json
{
  "projectId": "proj_abc123",
  "planId": "plan_456",
  "quality": "1080p",
  "format": "mp4",
  "watermark": false
}
```

**Response:**
```json
{
  "renderId": "render_001",
  "status": "queued",
  "estimatedTime": 300,
  "position": 5
}
```

#### Get Render Status

```http
GET /api/render/{renderId}/status
```

**Response:**
```json
{
  "renderId": "render_001",
  "status": "processing",
  "progress": 45,
  "currentStep": "Adding transitions",
  "estimatedTimeRemaining": 165
}
```

#### Download Rendered Video

```http
GET /api/render/{renderId}/download
```

**Response:**
```json
{
  "downloadUrl": "https://storage.googleapis.com/...",
  "expiresAt": "2024-01-15T12:00:00Z",
  "size": 104857600,
  "duration": 180,
  "format": "mp4",
  "resolution": "1920x1080"
}
```

### Templates

#### List Templates

```http
GET /api/templates?type=travel
```

**Response:**
```json
{
  "templates": [
    {
      "id": "tmpl_travel_01",
      "name": "Adventure Journey",
      "description": "Perfect for outdoor adventures",
      "thumbnail": "https://...",
      "settings": {
        "style": "energetic",
        "musicGenre": "rock",
        "transitionStyle": "quick"
      }
    }
  ]
}
```

#### Apply Template

```http
POST /api/plan/apply-template
```

**Request Body:**
```json
{
  "projectId": "proj_abc123",
  "templateId": "tmpl_travel_01"
}
```

### User Settings

#### Get User Profile

```http
GET /api/user/profile
```

**Response:**
```json
{
  "userId": "user_123",
  "email": "user@example.com",
  "displayName": "John Doe",
  "subscription": {
    "tier": "pro",
    "validUntil": "2024-12-31T23:59:59Z",
    "usage": {
      "vlogsCreated": 15,
      "storageUsed": 5368709120,
      "minutesProcessed": 450
    },
    "limits": {
      "vlogsPerMonth": 50,
      "storageLimit": 107374182400,
      "maxResolution": "1080p"
    }
  }
}
```

#### Update Preferences

```http
PUT /api/user/preferences
```

**Request Body:**
```json
{
  "defaultStyle": "cinematic",
  "emailNotifications": true,
  "autoSave": true
}
```

## WebSocket Events

### Connection

```javascript
const ws = new WebSocket('wss://api.autocut.app/ws');
ws.send(JSON.stringify({
  type: 'auth',
  token: firebaseIdToken
}));
```

### Event Types

#### Project Update
```json
{
  "type": "project_update",
  "projectId": "proj_abc123",
  "status": "analyzing",
  "progress": 60
}
```

#### Analysis Complete
```json
{
  "type": "analysis_complete",
  "projectId": "proj_abc123",
  "analysisId": "analysis_789"
}
```

#### Plan Modified
```json
{
  "type": "plan_modified",
  "planId": "plan_456",
  "changes": ["Duration updated", "New clip added"]
}
```

#### Render Progress
```json
{
  "type": "render_progress",
  "renderId": "render_001",
  "progress": 75,
  "currentStep": "Encoding video"
}
```

#### Render Complete
```json
{
  "type": "render_complete",
  "renderId": "render_001",
  "downloadUrl": "https://..."
}
```

## Error Responses

### Error Format

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request body is invalid",
    "details": {
      "field": "title",
      "reason": "Title is required"
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing authentication token |
| `FORBIDDEN` | 403 | User doesn't have permission |
| `NOT_FOUND` | 404 | Resource not found |
| `INVALID_REQUEST` | 400 | Request validation failed |
| `QUOTA_EXCEEDED` | 429 | Rate limit or usage quota exceeded |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

## Rate Limits

| Tier | Requests/Minute | Requests/Hour | Requests/Day |
|------|----------------|---------------|--------------|
| Free | 60 | 1,000 | 10,000 |
| Pro | 300 | 5,000 | 50,000 |
| Business | 1,000 | 20,000 | 200,000 |

Rate limit headers:
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642329600
```

## SDKs and Code Examples

### JavaScript/TypeScript

```typescript
import { AutoCutClient } from '@autocut/sdk';

const client = new AutoCutClient({
  apiKey: process.env.AUTOCUT_API_KEY,
  baseUrl: 'https://api.autocut.app'
});

// Create project
const project = await client.projects.create({
  title: 'My Vlog',
  type: 'travel'
});

// Upload media
const uploadUrls = await client.media.getUploadUrls(project.id, files);

// Analyze content
const analysis = await client.analyze(project.id);

// Generate plan
const plan = await client.plans.generate(project.id, {
  duration: 180,
  style: 'cinematic'
});

// Render video
const render = await client.render(project.id, plan.id);
```

### Python

```python
from autocut import AutoCutClient

client = AutoCutClient(
    api_key=os.environ["AUTOCUT_API_KEY"],
    base_url="https://api.autocut.app"
)

# Create project
project = client.projects.create(
    title="My Vlog",
    type="travel"
)

# Upload media
upload_urls = client.media.get_upload_urls(project.id, files)

# Analyze content
analysis = client.analyze(project.id)

# Generate plan
plan = client.plans.generate(
    project.id,
    duration=180,
    style="cinematic"
)

# Render video
render = client.render(project.id, plan.id)
```

### cURL

```bash
# Create project
curl -X POST https://api.autocut.app/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My Vlog","type":"travel"}'

# Get project
curl https://api.autocut.app/api/projects/proj_abc123 \
  -H "Authorization: Bearer $TOKEN"
```

## Webhooks

Configure webhooks to receive real-time notifications:

### Webhook Setup

```http
POST /api/webhooks
```

**Request Body:**
```json
{
  "url": "https://your-server.com/webhook",
  "events": ["render.complete", "analysis.complete"],
  "secret": "your_webhook_secret"
}
```

### Webhook Payload

```json
{
  "event": "render.complete",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "renderId": "render_001",
    "projectId": "proj_abc123",
    "downloadUrl": "https://..."
  }
}
```

### Webhook Verification

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return `sha256=${hash}` === signature;
}
```

## API Versioning

The API uses URL versioning. The current version is v1.

```
https://api.autocut.app/v1/projects
```

Deprecated endpoints will include a `Sunset` header:
```http
Sunset: Sat, 31 Dec 2024 23:59:59 GMT
```

## Support

For API support:
- Email: api-support@autocut.app
- Documentation: https://docs.autocut.app
- Status page: https://status.autocut.app