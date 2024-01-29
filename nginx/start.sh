#!/usr/bin/env sh

echo "Setting Service Account JSON credentials..."
echo "$YC_SA_JSON_CREDENTIALS" > key.json

echo "Creating Service Account profile..."
yc config profile create sa-profile
yc config set service-account-key key.json
yc config set folder-id $YC_FOLDER_ID

./start-nginx.sh &
./start-cron.sh &

wait -n 
exit $?