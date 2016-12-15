###############################################################################
# Caleydo - Visualization for Molecular Biology - http://caleydo.org
# Copyright (c) The Caleydo Team. All rights reserved.
# Licensed under the new BSD license, available at http://caleydo.org/license
###############################################################################
from __future__ import print_function
import gevent.monkey
import logging.config

gevent.monkey.patch_all()  # ensure the standard libraries are patched

# set configured registry
def _get_config():
  from phovea_server import config
  return config.view('<%-name%>')

cc = _get_config()
# configure logging
logging.config.dictConfig(cc.logging)
_log = logging.getLogger(__name__)

def _main():
  from < % -name % >.server import main
  main()

if __name__ == '__main__':
  _main()
