FROM python:2.7

MAINTAINER Samuel Gratzl <samuel.gratzl@datavisyn.io>

ADD . /phovea
WORKDIR /phovea
# RUN apt-get install -y python-pip python-dev zlib1g-dev cython
# RUN apt-get install -y `cat debian_packages.txt | tr '\r' ' ' | tr '\n' ' '`
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir -r requirements_dev.txt

# winpty docker run -t -i phovea_workspace /bin/bash
#  winpty docker run -t -i -p 9000:9000 phovea_workspace python phovea_server
