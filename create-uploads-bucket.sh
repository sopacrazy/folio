#!/bin/bash
set -e

REGION="us-east-2"
BUCKET="folio-uploads-533267364587"

echo "Criando bucket $BUCKET..."
aws s3api create-bucket \
  --bucket $BUCKET \
  --region $REGION \
  --create-bucket-configuration LocationConstraint=$REGION

echo "Desbloqueando acesso publico (necessario para servir as imagens)..."
aws s3api put-public-access-block \
  --bucket $BUCKET \
  --public-access-block-configuration \
    BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false \
  --region $REGION

echo "Aplicando politica de leitura publica..."
cat > /tmp/bucket-policy.json << POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET/*"
    }
  ]
}
POLICY

aws s3api put-bucket-policy \
  --bucket $BUCKET \
  --policy file:///tmp/bucket-policy.json \
  --region $REGION

echo "Configurando CORS (para permitir upload direto do navegador se precisar no futuro)..."
cat > /tmp/cors-config.json << CORS
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": []
    }
  ]
}
CORS

aws s3api put-bucket-cors \
  --bucket $BUCKET \
  --cors-configuration file:///tmp/cors-config.json \
  --region $REGION

echo "Pronto! Bucket criado: https://$BUCKET.s3.$REGION.amazonaws.com/"
echo "Verifique com: aws s3api get-bucket-policy --bucket $BUCKET --region $REGION"