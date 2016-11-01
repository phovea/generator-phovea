#!/usr/bin/env bash
set -e

conda create --name <%-env%> python=2.7 numpy scipy matplotlib pip gevent greenlet gunicorn
source activate <%-env%>

pip install -r requirements.txt
pip install -r requirements_dev.txt

source deactivate
