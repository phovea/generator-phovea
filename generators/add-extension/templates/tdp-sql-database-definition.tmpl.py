from tdp_core.dbview import DBViewBuilder, DBConnector, add_common_queries, inject_where, DBMapping

# idtype of the rows
idtype = 'TODO'
# column names of the table, it is used to verify dynamic parameters
columns = ['TODO', 'TODO']

# main dictionary containing all views registered for this plugin
views = dict()

# register the view for getting the mytable itself
views['<%-id%>'] = DBViewBuilder().idtype(idtype).table('<%-id%>') \
  .query("""SELECT my_id as id, * FROM <%-id%>""") \
  .derive_columns() \
  .assign_ids() \
  .call(inject_where) \
  .build()

# notes:
# by convention the 'id' column contains the identifier column of a row
# derive_columns ... try to automatically derive column and column types
# column(column, attrs) ... explicitly set a column type
# assign_ids ... the tdp server should automatically manage and assign unique integer ids based on the 'id' column
# .call(inject_where) ... utility to inject a where clause that is used for dynamic filtering

# create a set of common queries
add_common_queries(views, '<%-id%>', idtype, 'my_id as id', columns)


def create():
  """
  factory method to build this extension
  :return:
  """
  connector = DBConnector(views)
  connector.description = 'sample connector to the <%-id%> database'
  return connector
