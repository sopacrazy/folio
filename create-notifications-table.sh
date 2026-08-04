#!/bin/bash

REGION=${AWS_REGION:-us-east-2}

if aws dynamodb describe-table --table-name FolioNotifications --region $REGION >/dev/null 2>&1; then
  echo "FolioNotifications já existe em $REGION."
  exit 0
fi

echo "Criando FolioNotifications em $REGION..."
aws dynamodb create-table \
  --table-name FolioNotifications \
  --attribute-definitions \
    AttributeName=notificationId,AttributeType=S \
    AttributeName=userId,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
  --key-schema AttributeName=notificationId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes file://create-notifications-gsi.json \
  --region $REGION

echo "Pronto! Aguarde a tabela FolioNotifications ficar ACTIVE."
