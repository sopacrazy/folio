$Region = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-2" }
$GsiFile = Join-Path $PSScriptRoot "create-notifications-gsi.json"

aws dynamodb describe-table --table-name FolioNotifications --region $Region *> $null
if ($LASTEXITCODE -eq 0) {
  Write-Host "FolioNotifications ja existe em $Region."
  exit 0
}

Write-Host "Criando FolioNotifications em $Region..."
aws dynamodb create-table `
  --table-name FolioNotifications `
  --attribute-definitions `
    AttributeName=notificationId,AttributeType=S `
    AttributeName=userId,AttributeType=S `
    AttributeName=createdAt,AttributeType=S `
  --key-schema AttributeName=notificationId,KeyType=HASH `
  --billing-mode PAY_PER_REQUEST `
  --global-secondary-indexes "file://$GsiFile" `
  --region $Region

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Host "Pronto! Aguarde a tabela FolioNotifications ficar ACTIVE."
