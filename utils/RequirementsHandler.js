

class RequirementsHandler {
  constructor(requirements) {
    this.master = this.getMasterRequirements(requirements);
  }

  getMasterRequirements(requirements) {
    return requirements.map((requirement) => {
      return this._isNotPublishedToPip(requirement.name) ?
        this.getUnpublishedVersion(requirement) : this.getPublishedVersion(requirement)
    })
  }

  getUnpublishedVersion(requirement) {
    return `${requirement.name}@v${requirement.version}#egg=${this._pipToNpm(requirement.name)}`
  }

  getPublishedVersion(requirement) {
    return `${this._pipToNpm(requirement.name)}>=${requirement.version.charAt(0)}.0.0,<${parseInt(requirement.version.charAt(0)) + 1}.0.0`
  }

  // from `-e git+https://github.com/datavisyn/tdp_core.git` to `tdp_core`
  _pipToNpm(requirement) {
    const regex = /\/(?!.*\/)(.*)\.git/;
    const match = requirement.match(regex);
    if (match) {
      return match[1];
    }
    return requirement;
  }


  // get it from yo-rc.son
  _isNotPublishedToPip(dependency) {
    return dependency.startsWith('-e') && dependency.endsWith('.git') && dependency.endsWith('tdp_core.git')
  }
}

module.exports = RequirementsHandler;
