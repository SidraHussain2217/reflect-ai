# Reflective AI Journal & Mood Tracker

A private, user-authenticated journaling and mood tracking web application powered by **Gemini 3.6 Flash** and **Cloud Firestore**, with multi-turn reflections, audio voice memo support, and long-term memory continuity.

---

## Architecture & Security Highlights

- **User Identity**: Firebase Authentication with Federated Google Sign-In (no custom password storage).
- **Database & Isolation**: Cloud Firestore with owner-bound security rules (`/users/{userId}/interactions/{interactionId}`) guaranteeing complete user data isolation.
- **AI Processing Engine**: Server-side Gemini 3.6 Flash with automated fallback ladder (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`), processing voice audio memos & journal entries into structured JSON reflections, mood scores, and actionable takeaways.
- **Payload Hygiene**: Strict undefined-stripping (`stripUndefined`), defensive payload ingestion, and transaction verification with user-facing retry options.

---

## 1. Prerequisites & Environment Configuration

Ensure you have installed the Google Cloud CLI (`gcloud`) and have an active Google Cloud Project with billing enabled.

```bash
# Set your project ID
export PROJECT_ID="YOUR_PROJECT_ID"
export REGION="asia-east1" # or your preferred region
export SERVICE_NAME="reflective-ai-journal"

gcloud config set project $PROJECT_ID

# Enable required Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com
```

---

## 2. Secret Management Setup (Secret Manager)

Store the Gemini API Key securely in Google Cloud Secret Manager so it is never exposed in the browser or code repository:

```bash
# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Retrieve your Google Cloud Project Number
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

# 3. Grant the default Cloud Run runtime service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3. Database Security Configuration (Cloud Firestore)

Ensure your Cloud Firestore database is in Native Mode. Deploy the hardened, owner-bound security rules:

### `firestore.rules`
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Zero Insecure Defaults: deny all by default
    match /{document=**} {
      allow read, write: if false;
    }

    // User Data Isolation: interactions strictly owner-bound to the authenticated user
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy the rules via Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 4. Cloud Run Deployment Flow

Build and deploy the application container to Google Cloud Run:

```bash
# Build and deploy directly to Cloud Run
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --port=3000
```

---

## 5. Required Campaign Labeling (Automated Verification)

Apply the mandatory challenge verification label to register your Cloud Run service:

```bash
gcloud run services update $SERVICE_NAME \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=$REGION
```

---

## 6. Local Development

```bash
# 1. Install dependencies
npm install

# 2. Populate environment variables
cp .env.example .env
# Add your GEMINI_API_KEY into .env

# 3. Start development server
npm run dev
```

Visit `http://localhost:3000` to access the application.
