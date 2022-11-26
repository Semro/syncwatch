FROM nginx:alpine

COPY ./nginx.yc.conf /etc/nginx/conf.d/default.conf
COPY ./start-nginx.sh /start-nginx.sh

RUN chmod +x /start-nginx.sh

EXPOSE 80
EXPOSE 443
CMD [ "/start-nginx.sh" ]