@echo off

conda create --name <%-env%> python=2.7 numpy scipy matplotlib pip gevent greenlet gunicorn
activate <%-env%>

pip install -r requirements.txt
pip install -r requirements_dev.txt

deactivate
