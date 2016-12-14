@echo off

shift
echo docker-compose run --service-ports web %*
docker-compose run --service-ports web %*
