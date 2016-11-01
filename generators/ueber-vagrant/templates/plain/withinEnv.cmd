@echo off

shift
echo vagrant ssh --command %*
vagrant ssh --command %*
