#!/bin/bash

echo "Aguardando username-index ficar ACTIVE..."
while true; do
  STATUS=$(aws dynamodb describe-table --table-name FolioUsers --region us-east-2 --query "Table.GlobalSecondaryIndexes[0].IndexStatus" --output text)
  echo "Status atual: $STATUS"
  if [ "$STATUS" == "ACTIVE" ]; then
    echo "Indice ativo! Criando email-index agora..."
    break
  fi
  sleep 10
done

aws dynamodb update-table \
  --table-name FolioUsers \
  --attribute-definitions AttributeName=email,AttributeType=S \
  --global-secondary-index-updates \
    '[{"Create":{"IndexName":"email-index","KeySchema":[{"AttributeName":"email","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}}}]' \
  --region us-east-2

echo "Pronto! Confira com:"
echo "aws dynamodb describe-table --table-name FolioUsers --region us-east-2 --query \"Table.GlobalSecondaryIndexes[].{Nome:IndexName,Status:IndexStatus}\""