#!/bin/bash
set -e

REGION="us-east-2"
BUCKET="folio-uploads-533267364587"

echo "Aplicando politica de leitura publica..."
cat > bucket-policy.json << POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::BUCKET_NAME/*"
    }
  ]
}
POLICY
sed -i "s/BUCKET_NAME/$BUCKET/" bucket-policy.json

aws s3api put-bucket-policy \
  --bucket $BUCKET \
  --policy file://bucket-policy.json \
  --region $REGION

echo "Configurando CORS..."
cat > cors-config.json << CORS
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
  --cors-configuration file://cors-config.json \
  --region $REGION

rm -f bucket-policy.json cors-config.json

echo "Pronto! Bucket configurado: https://$BUCKET.s3.$REGION.amazonaws.com/"
echo "Verifique com: aws s3api get-bucket-policy --bucket $BUCKET --region $REGION"