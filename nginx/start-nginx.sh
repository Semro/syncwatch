#!/usr/bin/env sh

if [ -z "${NGINX_CERT_KEY}" ]; then
    echo "NGINX_CERT_KEY env variable is not provided. Provide private key for encrypted certificate in it"
    exit 1
fi

if [ -z "${NGINX_CERT}" ]; then
    echo "NGINX_CERT env variable is not provided. Provided encrypted certificate in it"
fi

mkdir -p /etc/nginx/certs

echo "$NGINX_CERT" | tr ';' '\n' > /etc/nginx/certs/certificate.crt
echo "$NGINX_CERT_KEY" | tr ';' '\n' > /etc/nginx/certs/certificate.key

nginx -g 'daemon off;'