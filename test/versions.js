const semver = require('semver');

console.log(semver.satisfies('v1.0.0', '^v2.0.0'));
console.log(semver.satisfies('v2.0.0', '^v2.0.0'));
console.log(semver.satisfies('v2.1.0', '^v2.0.0'));
console.log(semver.satisfies('v2.1.1', '^v2.0.0'));
console.log(semver.satisfies('v2.0.1', '~v2.0.0'));
console.log(semver.satisfies('v3.0.0', '^v2.0.0'));
console.log(semver.satisfies('v3.1.0', '^v2.0.0'));
