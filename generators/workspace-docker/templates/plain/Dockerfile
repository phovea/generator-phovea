FROM python:2.7

MAINTAINER Samuel Gratzl <samuel.gratzl@datavisyn.io>

RUN curl -sL https://deb.nodesource.com/setup_6.x | bash -
RUN apt-get install -y nodejs
# RUN apt-get install -y python-pip python-dev zlib1g-dev cython

WORKDIR /phovea
COPY requirements*.txt ./
RUN pip install --no-cache-dir -r requirements.txt && pip install --no-cache-dir -r requirements_dev.txt
# RUN apt-get install -y `cat debian_packages.txt | tr '\r' ' ' | tr '\n' ' '`


CMD ["python", "phovea_server", "--use_reloader", "--env", "dev"]

