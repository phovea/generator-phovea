## Release notes

*List of addressed issues and PRs since the last release*


## Checklists

### Release preparation

* [x] Create new `release-x.x.x` branch (based on `develop` branch)
* [ ] Collect changes and write [release notes](#release-notes)
* [ ] Draft release PR in GitHub that merges the `release-x.x.x` into the `main` branch

### Update version

* [ ] Update this version number based on the highest `release` label attached of the included PRs
* [ ] Run `npm install` on release branch to update _package-lock.json_
* [ ] Commit and push *package.json* and *package-lock.json* with new version number
* [ ] Wait until build is successful
* [ ] Assign reviewer and wait for final review
* [ ] Merge this pull request into main branch

### Publish npm release

* [ ] `npm login caleydo-bot`
* [ ] `npm publish`
* [ ] Check release on [npmjs.com](https://www.npmjs.com)

### Create GitHub release

* [ ] Draft a new release (Code -> Releases -> Draft a new release)
* [ ] Use new version number as tag (e.g., `v2.3.1`)
* [ ] Copy [release notes](#release-notes)
* [ ] Publish release

### Prepeare next develop release

* [ ] Merge `main` into `develop` branch
* [ ] Update version in *package.json* and *package-lock.json* to `<next patch version>-SNAPSHOT` (e.g., `2.3.1` to `2.3.2-SNAPSHOT`)
* [ ] Commit and push changes

### 🏁 Finish line

* [ ] Inform colleagues and customers about the release
* [ ] Celebrate the new release 🥳
