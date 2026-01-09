#!/bin/bash

# Load environment variables
source ./.env.sh

# Configure AWS CLI with custom S3 endpoint
aws configure set aws_access_key_id "$STORAGE_S3_KEY"
aws configure set aws_secret_access_key "$STORAGE_S3_SECRET"
aws configure set region "$STORAGE_S3_REGION"

# List objects and find the latest one
echo "Fetching latest backup from S3..."
LATEST_FILE=$(aws s3 ls "s3://$STORAGE_S3_BUCKET/" \
    --endpoint-url "$STORAGE_S3_ENDPOINT" \
    --region "$STORAGE_S3_REGION" | \
    sort | tail -n 1 | awk '{print $4}')

if [ -z "$LATEST_FILE" ]; then
    echo "Error: No files found in S3 bucket"
    exit 1
fi

echo "Latest backup file: $LATEST_FILE"

# Download the latest file
echo "Downloading $LATEST_FILE..."
aws s3 cp "s3://$STORAGE_S3_BUCKET/$LATEST_FILE" "./backup/$LATEST_FILE" \
    --endpoint-url "$STORAGE_S3_ENDPOINT" \
    --region "$STORAGE_S3_REGION"

if [ $? -eq 0 ]; then
    echo "Download successful"
    
    # Extract the file to current directory
    echo "Extracting $LATEST_FILE to current directory..."
    tar -xzf "./backup/$LATEST_FILE" -C "."
    
    if [ $? -eq 0 ]; then
        echo "Extraction successful"
        echo "Latest backup extracted to ./backup/"
    else
        echo "Error: Extraction failed"
        exit 1
    fi
else
    echo "Error: Download failed"
    exit 1
fi
