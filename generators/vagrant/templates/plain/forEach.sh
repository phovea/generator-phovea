#!/usr/bin/env bash
set -e

bak=`pwd`
for plugin in $(find . -type f -name 'package.json' -printf '%h\n' | sort -u); do
  cd ${bak}
  echo "on ${plugin} execute: $@"
  echo "#####################"
  cd ${plugin}
  ( exec $@ )
done
