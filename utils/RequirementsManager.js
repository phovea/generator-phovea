// // const {toBaseName, findBase, findName, toCWD, failed} = require('./release')
// // const {parseRequirements} = require('./pip');
// const fs = require('fs');
// const knownRepositories = require('../knownRepositories');
// var rp = require('request-promise');

// class RequirementsManager {
//   constructor(requirements) {
//     this.requirements = requirements
//   }
//   getRequirements() {
//     const foreignRequirements = Object.keys(this.requirements).filter((req) => this.isKnownRepo(req)).map((r) => {return [r] + ':' + this.requirements[r]})//requirements minus our repos
//     const knownRequirements = Object.keys(this.requirements).filter((req) => this.isKnownRepo(req))//ourOwn requirements
//     return {known: knownRequirements, foreign: foreignRequirements}
//   }
//   isKnownRepo(repo) {
//     return Object.keys(knownRepositories).some((r) => knownRepositories[r].includes(repo) || knownRepositories[r].some((d) => repo.includes(d)))
//   }
//   /**
//  * Get latest clue of repository
//  * @param {string} dep i.e phovea_clue
//  */
//   _getDependencyTag(dep) {
//     const options = {
//       url: `https://${this.username}:${this._getAccessToken(dep)}@api.github.com/repos/${dep}/releases`,
//       headers: {
//         'User-Agent': 'request'
//       }
//     };
//     //TODO package not yet released
//     // this._logVerbose([chalk.cyan('Running:'), chalk.italic(`GET https://${this.username}:****************************************@api.github.com/repos/${dep}/releases`)]);
//     return rp(options).then((d) => JSON.parse(d)[0].name.replace('v', ''));
//   }
// }
// module.exports = RequirementsManager;
