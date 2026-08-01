#!/bin/bash
set -e

REGION="us-east-2"

echo "Criando FolioProjects..."
aws dynamodb create-table \
  --table-name FolioProjects \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=ownerId,AttributeType=S \
    AttributeName=slug,AttributeType=S \
    AttributeName=feedKey,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
    "[
      {
        \"IndexName\": \"ownerId-slug-index\",
        \"KeySchema\": [
          {\"AttributeName\":\"ownerId\",\"KeyType\":\"HASH\"},
          {\"AttributeName\":\"slug\",\"KeyType\":\"RANGE\"}
        ],
        \"Projection\": {\"ProjectionType\":\"ALL\"}
      },
      {
        \"IndexName\": \"feed-index\",
        \"KeySchema\": [
          {\"AttributeName\":\"feedKey\",\"KeyType\":\"HASH\"},
          {\"AttributeName\":\"createdAt\",\"KeyType\":\"RANGE\"}
        ],
        \"Projection\": {\"ProjectionType\":\"ALL\"}
      }
    ]" \
  --region $REGION

echo "Criando FolioBadges..."
aws dynamodb create-table \
  --table-name FolioBadges \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=slug,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
    "[
      {
        \"IndexName\": \"slug-index\",
        \"KeySchema\": [{\"AttributeName\":\"slug\",\"KeyType\":\"HASH\"}],
        \"Projection\": {\"ProjectionType\":\"ALL\"}
      }
    ]" \
  --region $REGION

echo "Criando FolioUserBadges..."
aws dynamodb create-table \
  --table-name FolioUserBadges \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=badgeId,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=badgeId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION

echo "Pronto! Verifique com: aws dynamodb list-tables --region $REGION"