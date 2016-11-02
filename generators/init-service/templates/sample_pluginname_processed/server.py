###############################################################################
# Caleydo - Visualization for Molecular Biology - http://caleydo.org
# Copyright (c) The Caleydo Team. All rights reserved.
# Licensed under the new BSD license, available at http://caleydo.org/license
###############################################################################
from __future__ import print_function


def main():
  import argparse
  parser = argparse.ArgumentParser(description='<%-name%>')
  args = parser.parse_args()

  print('Hello World', args)
