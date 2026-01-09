#!/bin/bash

# Upload backup file to S3
# Usage: ./9-upload.sh <file_path> <bucket_name>

source ./.env.sh

# Configure AWS CLI
export AWS_ACCESS_KEY_ID="$STORAGE_S3_KEY"
export AWS_SECRET_ACCESS_KEY="$STORAGE_S3_SECRET"
export AWS_DEFAULT_REGION="$STORAGE_S3_REGION"

if [ $# -lt 2 ]; then
    echo "Usage: $0 <file_path> <bucket_name> [region]"
    exit 1
fi

FILE_PATH=$1
BUCKET_NAME=$2
REGION=${3:-us-east-1}
ENDPOINT=${S3_ENDPOINT:-https://s3.amazonaws.com}

# Extract filename from path
FILE_NAME=$(basename "$FILE_PATH")

# Check if file exists
if [ ! -f "$FILE_PATH" ]; then
    echo "Error: File not found: $FILE_PATH"
    exit 1
fi

# Check if AWS credentials are set
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "Error: AWS credentials not configured (AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY required)"
    exit 1
fi

echo "Uploading $FILE_NAME to S3 bucket: $BUCKET_NAME"

# Upload to S3
aws s3 cp "$FILE_PATH" "s3://$BUCKET_NAME/$FILE_NAME" \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION"

if [ $? -eq 0 ]; then
    echo "Successfully uploaded $FILE_NAME to S3"
else
    echo "Upload failed"
    exit 1
fi
