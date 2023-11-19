FROM nginx:alpine

COPY ./nginx.yc.conf /etc/nginx/conf.d/default.conf
COPY ./start-nginx.sh /start-nginx.sh

RUN apk update && apk add curl && apk add bash
RUN curl https://storage.yandexcloud.net/yandexcloud-yc/install.sh | \
    bash -s -- -i /opt/yandex-cloud -n
ENV PATH="${PATH}:/opt/yandex-cloud/bin/"

RUN chmod +x /start-nginx.sh

EXPOSE 80
EXPOSE 443
CMD [ "/start-nginx.sh" ]