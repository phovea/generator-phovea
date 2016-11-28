FROM skiftcreative/gunicorn:2.7

MAINTAINER Samuel Gratzl <samuel.gratzl@datavisyn.io>

COPY build /deploy/app
COPY __init__.py /deploy/app
RUN pip install -U -r /deploy/app/requirements.txt

