#!/usr/bin/env bash

basedir="/vagrant/"

#########################
#packages
echo "--- Start package provisioning ---"

rm -f package_list_t.txt
touch package_list_t.txt
for line in $(find ${basedir} -maxdepth 2 -name 'debian_packages.txt'); do
  cat ${line} >> package_list_t.txt
done
sort -u package_list_t.txt -o package_list.txt

set -vx #to turn echoing on and
#sudo apt-get install -y `cat package_list.txt | tr '\r' ' ' | tr '\n' ' '`
set +vx #to turn them both off
echo `cat package_list.txt | tr '\r' ' ' | tr '\n' ' '`
echo "--- Start creating start scripts ---"

for plugin in $(find ${basedir} -maxdepth 2 -type f -name '__main__.py' -printf '%h\n' | sort -u); do
  echo "#!/usr/bin/env bash
if [ '`whoami`' != 'vagrant' ] ; then
  #outside of vm
  vagrant up
  vagrant ssh --command 'python ${plugin}'
else
  #within vm
  python ${plugin}
fi
" > ${basedir}start_t.sh
  chmod +x ${basedir}start_t.sh
done
