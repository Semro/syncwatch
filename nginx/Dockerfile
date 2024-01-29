FROM nginx:alpine

COPY ./nginx.yc.conf /etc/nginx/conf.d/default.conf
COPY ./cronjobs /etc/crontabs/root

COPY ./start.sh /start.sh
COPY ./start-nginx.sh /start-nginx.sh
COPY ./start-cron.sh /start-cron.sh

COPY ./get-cert.sh /get-cert.sh
COPY ./update-cert.sh /update-cert.sh

RUN apk update && apk add curl && apk add bash
RUN curl https://storage.yandexcloud.net/yandexcloud-yc/install.sh | \
    bash -s -- -i /opt/yandex-cloud -n
ENV PATH="${PATH}:/opt/yandex-cloud/bin/"

RUN chmod +x /start.sh
RUN chmod +x /start-cron.sh
RUN chmod +x /start-nginx.sh
RUN chmod +x /get-cert.sh
RUN chmod +x /update-cert.sh

EXPOSE 80
EXPOSE 443
CMD [ "/start.sh" ]