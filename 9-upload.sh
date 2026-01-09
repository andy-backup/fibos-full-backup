#!/bin/bash

# Upload backup file to S3
# Usage: ./9-upload.sh <file_path> 

source ./.env.sh

FILE_PATH=$1

# Extract filename from path
FILE_NAME=$(basename "$FILE_PATH")

# Check if file exists
if [ ! -f "$FILE_PATH" ]; then
    echo "Error: File not found: $FILE_PATH"
    exit 1
fi

echo "Uploading $FILE_NAME to S3 bucket: $STORAGE_S3_BUCKET"

# Upload to S3
aws s3 cp "$FILE_PATH" "s3://$STORAGE_S3_BUCKET/$FILE_NAME" \
    --endpoint-url "$STORAGE_S3_ENDPOINT" \
    --region "$STORAGE_S3_REGION"

if [ $? -eq 0 ]; then
    echo "Successfully uploaded $FILE_NAME to S3"
else
    echo "Upload failed"
    exit 1
fi
