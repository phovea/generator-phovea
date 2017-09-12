import logging
from tdp_core import db

_log = logging.getLogger(__name__)


class <%-moduleName%>Table(object):
  def __init__(self):
    self.from_idtype = 'TODO'
    self.to_idtype = 'TODO'

  def __call__(self, ids):
    """
    maps the given ids to the output id type
    :param ids: the list of input id strings
    :return: a list of string lists one for each id, empty array indicate that for this specified id no mapping was found
    """
    # TODO
    return [[id] for id in ids]


class <%-moduleName%>(object):
  """
  a mapping provider extension can implement multiple mapping tables at once, i.e. register multiple mappings for different types
  """

  def __init__(self):
    self.mapper = [<%-module%>Table()]

  def __iter__(self):
    """
    returns an iterable of all available mapper of this mapping provider
    :return: iterator that returns a tuple like (from_idtype, to_idtype, function doing the mapping)
    """
    return iter(((f.from_idtype, f.to_idtype, f) for f in self.mapper))


def create():
  return <%-moduleName%>()
