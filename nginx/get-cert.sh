#!/usr/bin/env sh

echo "Getting certificate..."
yc certificate-manager certificate content \
    --id $YC_CERTIFICATE_ID \
    --chain /etc/nginx/certs/certificate_full_chain.pem \
    --key /etc/nginx/certs/private_key.pem \
    > /dev/null