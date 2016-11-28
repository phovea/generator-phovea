FROM skiftcreative/supervisor:2.7

MAINTAINER Samuel Gratzl <samuel.gratzl@datavisyn.io>

RUN mkdir -p /deploy/app /deploy/run

WORKDIR /deploy/app

COPY supervisord.conf /etc/supervisor/conf.d/phovea_service.conf


COPY build /deploy/app
RUN pip install -U -r /deploy/app/requirements.txt

