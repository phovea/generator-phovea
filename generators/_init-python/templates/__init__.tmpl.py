###############################################################################
# Caleydo - Visualization for Molecular Biology - http://caleydo.org
# Copyright (c) The Caleydo Team. All rights reserved.
# Licensed under the new BSD license, available at http://caleydo.org/license
###############################################################################


def phovea(registry):
    """
    register extension points
    :param registry:
    """

    # generator-phovea:begin
    <% - sextensions.map((d) => `    registry.append('${d.type}', '${d.id}', '${name.toLowerCase()}.${d.module}', ${stringifyPython(d.extras, '  ')})`).join('\n\n')%>
    # generator-phovea:end
    pass
