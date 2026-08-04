#!/bin/bash
set -e

REGION="us-east-2"

echo "Criando FolioUsers..."
aws dynamodb create-table \
  --table-name FolioUsers \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=username,AttributeType=S \
    AttributeName=email,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
    "[
      {
        \"IndexName\": \"username-index\",
        \"KeySchema\": [{\"AttributeName\":\"username\",\"KeyType\":\"HASH\"}],
        \"Projection\": {\"ProjectionType\":\"ALL\"}
      },
      {
        \"IndexName\": \"email-index\",
        \"KeySchema\": [{\"AttributeName\":\"email\",\"KeyType\":\"HASH\"}],
        \"Projection\": {\"ProjectionType\":\"ALL\"}
      }
    ]" \
  --region $REGION

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

echo "Criando FolioNotifications..."
aws dynamodb create-table \
  --table-name FolioNotifications \
  --attribute-definitions \
    AttributeName=notificationId,AttributeType=S \
    AttributeName=userId,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
  --key-schema AttributeName=notificationId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
    "[
      {
        \"IndexName\": \"userId-createdAt-index\",
        \"KeySchema\": [
          {\"AttributeName\":\"userId\",\"KeyType\":\"HASH\"},
          {\"AttributeName\":\"createdAt\",\"KeyType\":\"RANGE\"}
        ],
        \"Projection\": {\"ProjectionType\":\"ALL\"}
      }
    ]" \
  --region $REGION

echo "Pronto! As tabelas foram criadas (podem levar alguns segundos para ficarem ACTIVE)."
echo "Verifique com: aws dynamodb list-tables --region $REGION"
