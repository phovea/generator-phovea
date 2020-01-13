## Release notes

*List of addressed issues and PRs since the last release*


## Checklists

### Release preparation

* [x] Create new `release-x.x.x` branch (based on `develop` branch)
* [ ] Collect changes and write [release notes](#release-notes)
* [ ] Draft release PR in GitHub that merges the `release-x.x.x` into the `master` branch

### Release dependencies first

In case of dependent Phovea/TDP repositories follow [dependency tree](https://wiki.datavisyn.io/phovea/fundamentals/development-process#dependency-hierarchy) from the top:

* [ ] Release dependent repositories if they contain changes first before proceeding here
* [ ] Replace git dependencies in *package.json* with new version range (e.g., `"phovea_core": "^2.3.1"`)
* [ ] Commit and push new dependencies
* [ ] Wait until build is successful
* [ ] Repeat with other repositories/dependencies or proceed with next section

### Update version

* [ ] Check version numbers of dependencies again
* [ ] Check if build is successful
* [ ] Update this version number following [semver](https://semver.org)
* [ ] Commit and push *package.json* with new version number
* [ ] Wait until build is successful
* [ ] Assign reviewer and wait for final review
* [ ] Merge this pull request into master branch
* [ ] Add release label (i.e., `release: major`, `release: minor`, or `release: patch`)

### Publish npm release

The steps of this section are only necessary if the code is public and should be published to the npm registry.

* [ ] `rm -rf dist && rm -rf build && rm -rf node_modules/ && rm -rf package-lock.json`
* [ ] `docker run -it -v $(pwd):/phovea circleci/node:12.13-buster-browsers /bin/bash` and continue inside the container
* [ ] `cd /phovea`
* [ ] `npm install`
* [ ] `npm run build` to build the bundles
* [ ] `npm login` as caleydo-bot
* [ ] `npm publish`
* [ ] Check release on [npmjs.com](https://www.npmjs.com)

### Create GitHub release

* [ ] Draft a new release (Code -> Releases -> Draft a new release)
* [ ] Use new version number as tag (e.g., `v2.3.1`)
* [ ] Copy [release notes](#release-notes)
* [ ] Publish release

### Prepeare next develop release

* [ ] Switch to `develop` branch
* [ ] Merge `master` branch into `develop` (`git merge origin/master`)
* [ ] Update version in *package.json* to `<next patch version>-SNAPSHOT` (e.g., `2.3.1` to `2.3.2-SNAPSHOT`)
* [ ] Revert dependencies in *package.json* to develop branches (e.g., `"phovea_core": "github:phovea/phovea_core#develop"`)
* [ ] Commit and push changes
 
### 🏁 Finish line

* [ ] Inform colleagues and customers about the release
* [ ] Celebrate the new release 🥳
