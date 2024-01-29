#!/usr/bin/env sh

/get-cert.sh

echo "Reload nginx..."
nginx -s reload && echo "Updated certificate"