#!/bin/bash

# 1. 加载环境变量
# 使用绝对路径或相对路径加载 .env.sh
SCRIPT_DIR=$(dirname "$0")
if [ -f "$SCRIPT_DIR/.env.sh" ]; then
    source "$SCRIPT_DIR/.env.sh"
else
    echo "Error: .env.sh not found!"
    exit 1
fi

# 2. 检查输入参数
FILE_PATH=$1
if [ -z "$FILE_PATH" ]; then
    echo "Usage: $0 <file_path>"
    exit 1
fi

# 3. 提取文件名并检查文件是否存在
FILE_NAME=$(basename "$FILE_PATH")

if [ ! -f "$FILE_PATH" ]; then
    echo "Error: File not found: $FILE_PATH"
    exit 1
fi

echo "------------------------------------------------"
echo "Starting upload: $FILE_NAME"
echo "Target Bucket  : $STORAGE_S3_BUCKET"
echo "Endpoint       : $STORAGE_S3_ENDPOINT"
echo "------------------------------------------------"

# 4. 执行上传
# 注意：由于 .env.sh 已经 export 了 AWS_ACCESS_KEY_ID 和 AWS_SECRET_ACCESS_KEY，
# aws 命令会自动识别这些变量。
aws s3 cp "$FILE_PATH" "s3://$STORAGE_S3_BUCKET/$FILE_NAME" \
    --endpoint-url "$STORAGE_S3_ENDPOINT" \
    --region "$AWS_DEFAULT_REGION"

# 5. 检查执行结果
if [ $? -eq 0 ]; then
    echo "------------------------------------------------"
    echo "✅ Success: $FILE_NAME uploaded successfully."
else
    echo "------------------------------------------------"
    echo "❌ Error: Upload failed. Please check your credentials and network."
    exit 1
fi