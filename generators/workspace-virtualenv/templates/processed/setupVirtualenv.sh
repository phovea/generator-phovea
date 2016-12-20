#!/usr/bin/env bash
set -e

virtualenv --system-site-packages <%-env%>
source <%-env%>/bin/activate

pip install -r requirements.txt
pip install -r requirements_dev.txt

deactivate
