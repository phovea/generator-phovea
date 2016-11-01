@echo off

shift
vagrant up
vagrant ssh --command '%*'
