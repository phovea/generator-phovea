@echo off

shift
echo docker run -d -p 9000:9000 -name <%-containerName%>_i <%-containerName%> %*
docker run -d -p 9000:9000 -name <%-containerName%>_i <%-containerName%> %*
