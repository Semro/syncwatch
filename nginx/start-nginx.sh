#!/usr/bin/env sh

mkdir -p /etc/nginx/certs

/get-cert.sh

nginx -g 'daemon off;'