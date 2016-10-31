<%- name %> [![Phovea][phovea-image]][phovea-url] [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url]
=====================



Installation
------------

```
git clone <%= repository %>
cd <%- name %>
npm install
```

Testing
-------

```
npm run test
```

Building
--------

```
npm run build
```

<%- content %>

***

<a href="https://caleydo.org"><img src="http://caleydo.org/assets/images/logos/caleydo.svg" align="left" width="200px" hspace="10" vspace="6"></a>
This repository is part of **[Phovea](http://phovea.caleydo.org/)**, a platform for developing web-based visualization applications. For tutorials, API docs, and more information about the build and deployment process, see the [documentation page](http://caleydo.org/documentation/).


<% if (type === 'app') { %>[phovea-image]: https://img.shields.io/badge/Phovea-Application-1BA64E.svg
<% } else if (type === 'bundle') { %>[phovea-image]: https://img.shields.io/badge/Phovea-Web%20Bundle-FABC15.svg
<% } else if (type === 'server') { %>[phovea-image]: https://img.shields.io/badge/Phovea-Server%20Plugin-10ACDF.svg
<% } else { %>[phovea-image]: https://img.shields.io/badge/Phovea-Client%20Plugin-F47D20.svg
<% } -%>
[phovea-url]: https://phovea.caleydo.org
[npm-image]: https://badge.fury.io/js/<%= name %>.svg
[npm-url]: https://npmjs.org/package/<%= name %>
[travis-image]: https://travis-ci.org/<%-githubAccount%>/<%-name%>.svg?branch=master
[travis-url]: https://travis-ci.org/<%-githubAccount%>/<%-name%>
[daviddm-image]: https://david-dm.org/<%-githubAccount%>/<%-name%>.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/<%-githubAccount%>/<%-name%>