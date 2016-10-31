#!/usr/bin/env bash
echo "--- Start provisioning ---"
basedir="/vagrant/"

#update package sources
sudo apt-get update
#install git
sudo apt-get install -y build-essential git

#install all plugin provision scripts
cd /tmp

#########################
#node-js
echo "--- Start node provisioning ---"

if [ $(dpkg-query -W -f='${Status}' nodejs 2>/dev/null | grep -c "ok installed") -eq 0 ]; then
  sudo apt-get install -y curl
  curl -sL https://deb.nodesource.com/setup_6.x | sudo bash -
  sudo apt-get install -y nodejs
else
  echo "node already installed"
fi

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
sudo apt-get install -y `cat package_list.txt | tr '\r' ' ' | tr '\n' ' '`
set +vx #to turn them both off
rm package_list.txt

#########################
#python
echo "--- Start python provisioning ---"

#install python and some standard packages
sudo apt-get install -y python-pip python-dev zlib1g-dev cython

rm -f requirements_t.txt
touch requirements_t.txt
for line in $(find ${basedir} -maxdepth 2 -name 'requirements.txt'); do
  cat ${line} >> requirements_t.txt
done
sort -u requirements_t.txt -o requirements.txt
sudo pip install -r requirements.txt


#########################
#custom
echo "--- Start custom provisioning ---"

for line in $(find ${basedir} -maxdepth 2 -name 'vagrant*.sh'); do
  echo "--- execution provision script: $line"
  ( exec ${line} )
done


#########################
#start scripts
echo "--- Start creating start scripts ---"

for plugin in $(find ${basedir} -type f -name '__main__.py' -printf '%h\n' | sort -u); do
  echo "#!/usr/bin/env bash\n\npython ${plugin}\n" > ${basedir}/start_${plugin}.sh
  chmod +x ${basedir}/start_${plugin}.sh
done

echo "--- Done, use 'vagrant ssh' for jumping into the VM ---"
