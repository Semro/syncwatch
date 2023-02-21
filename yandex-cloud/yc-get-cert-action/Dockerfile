FROM alpine:3.10

COPY entrypoint.sh /entrypoint.sh

RUN ["chmod", "+x", "entrypoint.sh"]
RUN apk update && apk add curl && apk add bash

ENTRYPOINT ["/entrypoint.sh"]