#!/bin/bash
set -e

REGION="us-east-2"

echo "Criando FolioConversations..."
aws dynamodb create-table \
  --table-name FolioConversations \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=otherUserId,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=otherUserId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION

echo "Criando FolioDirectMessages..."
aws dynamodb create-table \
  --table-name FolioDirectMessages \
  --attribute-definitions \
    AttributeName=conversationId,AttributeType=S \
    AttributeName=sortKey,AttributeType=S \
  --key-schema \
    AttributeName=conversationId,KeyType=HASH \
    AttributeName=sortKey,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION

echo "Pronto! Verifique com:"
echo "aws dynamodb list-tables --region $REGION"
