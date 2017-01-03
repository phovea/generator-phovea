FROM nginx:alpine

MAINTAINER Samuel Gratzl <samuel.gratzl@datavisyn.io>

<%-clientOnly ? '#': ''%>COPY ./deploy/nginx-default.conf /etc/nginx/conf.d/default.conf
COPY ./build /usr/share/nginx/html
