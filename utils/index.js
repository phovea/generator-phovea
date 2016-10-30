

function patchPackageJSON(config, unset) {
  var pkg = this.fs.readJSON(this.destinationPath('package.json'), {});
  this.log('PACKAGE', pkg);

  var pkg_patch = JSON.parse(_.template(this.fs.read(this.templatePath('package.tmpl.json')))(config));
  extend(pkg, pkg_patch);

  (unset || []).forEach((d) => delete pkg[d]);

  this.fs.writeJSON(this.destinationPath('package.json'), pkg);

}

module.exports = {
  patchPackageJSON: patchPackageJSON
}
