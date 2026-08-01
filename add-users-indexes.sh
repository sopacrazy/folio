#!/bin/bash
set -e

REGION="us-east-2"

echo "Adicionando indice username-index..."
aws dynamodb update-table \
  --table-name FolioUsers \
  --attribute-definitions AttributeName=username,AttributeType=S \
  --global-secondary-index-updates \
    '[{"Create":{"IndexName":"username-index","KeySchema":[{"AttributeName":"username","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}}}]' \
  --region $REGION

echo "Aguardando indice ficar ativo antes de criar o proximo..."
aws dynamodb wait table-exists --table-name FolioUsers --region $REGION
sleep 15

echo "Adicionando indice email-index..."
aws dynamodb update-table \
  --table-name FolioUsers \
  --attribute-definitions AttributeName=email,AttributeType=S \
  --global-secondary-index-updates \
    '[{"Create":{"IndexName":"email-index","KeySchema":[{"AttributeName":"email","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}}}]' \
  --region $REGION

echo "Pronto! Verifique com:"
echo "aws dynamodb describe-table --table-name FolioUsers --region $REGION --query \"Table.GlobalSecondaryIndexes[].IndexName\""