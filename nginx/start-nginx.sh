#!/usr/bin/env sh

echo "Setting Service Account JSON credentials..."
echo "$YC_SA_JSON_CREDENTIALS" > key.json

echo "Creating Service Account profile..."
yc config profile create sa-profile
yc config set service-account-key key.json
yc config set folder-id $YC_FOLDER_ID

mkdir -p /etc/nginx/certs

echo "Getting certificate..."
yc certificate-manager certificate content \
    --id $YC_CERTIFICATE_ID \
    --chain /etc/nginx/certs/certificate_full_chain.pem \
    --key /etc/nginx/certs/private_key.pem \
    > /dev/null

nginx -g 'daemon off;'