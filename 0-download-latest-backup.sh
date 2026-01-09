#!/bin/bash

# 1. 加载环境变量
SCRIPT_DIR=$(dirname "$0")
if [ -f "$SCRIPT_DIR/.env.sh" ]; then
    source "$SCRIPT_DIR/.env.sh"
else
    echo "Error: .env.sh not found!"
    exit 1
fi

# 确保本地备份目录存在
mkdir -p ./backup

# 2. 获取最新文件
# 优化点：按最后修改时间排序 (--sort-by lastmodified)，确保拿到的是真正最新的
echo "Fetching latest backup from S3..."
LATEST_FILE=$(aws s3api list-objects-v2 \
    --bucket "$STORAGE_S3_BUCKET" \
    --endpoint-url "$STORAGE_S3_ENDPOINT" \
    --region "$AWS_DEFAULT_REGION" \
    --query 'sort_by(Contents, &LastModified)[-1].Key' \
    --output text)

# 检查是否获取到文件名（如果是空字符串或 "None"）
if [ -z "$LATEST_FILE" ] || [ "$LATEST_FILE" == "None" ]; then
    echo "Error: No files found in S3 bucket: $STORAGE_S3_BUCKET"
    exit 1
fi

echo "Latest backup file identified: $LATEST_FILE"

# 3. 下载文件
echo "Downloading $LATEST_FILE..."
aws s3 cp "s3://$STORAGE_S3_BUCKET/$LATEST_FILE" "./backup/$LATEST_FILE" \
    --endpoint-url "$STORAGE_S3_ENDPOINT" \
    --region "$AWS_DEFAULT_REGION"

if [ $? -ne 0 ]; then
    echo "Error: Download failed"
    exit 1
fi

echo "Download successful."

# 4. 解压文件
# 假设你的 tar 包内已经包含数据目录，-C "." 会解压到当前执行目录
echo "Extracting ./backup/$LATEST_FILE to current directory..."
tar -xzf "./backup/$LATEST_FILE" -C "."

if [ $? -eq 0 ]; then
    echo "✅ Extraction successful. Latest backup ready."
else
    echo "❌ Error: Extraction failed"
    exit 1
fi