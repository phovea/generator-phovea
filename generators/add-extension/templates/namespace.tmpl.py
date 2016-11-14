###############################################################################
# Caleydo - Visualization for Molecular Biology - http://caleydo.org
# Copyright (c) The Caleydo Team. All rights reserved.
# Licensed under the new BSD license, available at http://caleydo.org/license
###############################################################################

from phovea_server.ns import Namespace
from phovea_server.util import jsonfiy
import logging

app = Namespace(__name__)
_log = logger.getLogger(__name__)


@app.route('/')
def _hello():
  return jsonify({
    'message': 'Hello World'
  })


def create():
  return app
