#!/bin/bash
set -e

docker buildx build --no-cache --platform linux/amd64 \
  -t us-central1-docker.pkg.dev/finaibudgetingapp/finai/backend:latest \
  --push .

gcloud run deploy finai-backend \
  --image us-central1-docker.pkg.dev/finaibudgetingapp/finai/backend:latest \
  --platform managed \
  --region us-east1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 20 \
  --concurrency 80 \
  --project finaibudgetingapp \
  --env-vars-file env.yaml \
  --add-cloudsql-instances finaibudgetingapp:us-east1:finai-db