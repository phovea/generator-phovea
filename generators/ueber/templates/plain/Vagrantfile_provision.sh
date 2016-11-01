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

set -vx #to turn echoing on and
sudo apt-get install -y `cat ${basedir}debian_packages.txt | tr '\r' ' ' | tr '\n' ' '`
set +vx #to turn them both off

#########################
#python
echo "--- Start python provisioning ---"

#install python and some standard packages
sudo apt-get install -y python-pip python-dev zlib1g-dev cython

sudo pip install -r ${basedir}requirements.txt
sudo pip install -r ${basedir}requirements_dev.txt

#########################
#bash
echo "--- Start bash configuration ---"
if ! grep -Fxq "cd ${basedir}" /home/vagrant/.bashrc ; then
  echo "cd ${basedir}" >> /home/vagrant/.bashrc
  chown vagrant:vagrant /home/vagrant/.bashrc
fi

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

for plugin in $(find ${basedir} -maxdepth 2 -type f -name '__main__.py' -printf '%h\n' | sort -u); do
  echo "#!/usr/bin/env bash
if [ '\`whoami\`' != 'vagrant' ] ; then
  #outside of vm
  vagrant up
  vagrant ssh --command 'cd ${basedir} ; python ${plugin}'
else
  #within vm
  python ${plugin}
fi
" > ${basedir}start_${plugin##*/}.sh
  chmod +x ${basedir}start_${plugin##*/}.sh

  echo "
vagrant up
vagrant ssh --command 'cd ${basedir} ; python ${plugin}'
" > ${basedir}start_${plugin##*/}.cmd
done

echo "--- Done, use 'vagrant ssh' for jumping into the VM ---"
