#!/bin/bash
set -e

REGION="us-east-2"

echo "Criando FolioFollows..."
aws dynamodb create-table \
  --table-name FolioFollows \
  --attribute-definitions \
    AttributeName=followerId,AttributeType=S \
    AttributeName=followingId,AttributeType=S \
  --key-schema \
    AttributeName=followerId,KeyType=HASH \
    AttributeName=followingId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
    "[
      {
        \"IndexName\": \"followingId-index\",
        \"KeySchema\": [
          {\"AttributeName\":\"followingId\",\"KeyType\":\"HASH\"},
          {\"AttributeName\":\"followerId\",\"KeyType\":\"RANGE\"}
        ],
        \"Projection\": {\"ProjectionType\":\"ALL\"}
      }
    ]" \
  --region $REGION

echo "Criando FolioLikes..."
aws dynamodb create-table \
  --table-name FolioLikes \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=projectId,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=projectId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
    "[
      {
        \"IndexName\": \"projectId-index\",
        \"KeySchema\": [
          {\"AttributeName\":\"projectId\",\"KeyType\":\"HASH\"},
          {\"AttributeName\":\"userId\",\"KeyType\":\"RANGE\"}
        ],
        \"Projection\": {\"ProjectionType\":\"ALL\"}
      }
    ]" \
  --region $REGION

echo "Pronto! Verifique com:"
echo "aws dynamodb list-tables --region $REGION"