const fs = require('fs');
const fsPromises = fs.promises;
const { sep } = require('path');

const nodeModulesDir = 'node_modules';
const packageLockFilename = 'package-lock.json';
const dependenciesProperty = 'dependencies';

/**
 * Read a JSON file and return the parsed JSON
 * @param {string} filename Path to file
 */
async function readJSONFile(filename) {
    try {
        const data = await fsPromises.readFile(filename, 'utf-8');
        return JSON.parse(data);
    }
    catch(err) {
        console.log(err.message);
        process.exit(0); // exit without error
    }
}

/**
 * JSON stringify the given object and write it to the given file
 * @param {string} filename Path to file
 * @param {any} jsonObj Object structure
 */
async function writeJSONFile(filename, jsonObj) {
    try {
        fsPromises.writeFile(filename, JSON.stringify(jsonObj, null, 4), 'utf-8');
    }
    catch(err) {
        console.log(err.message);
        process.exit(0); // exit without error
    }
}

/**
 * Check if the given property exists on the first level of the given object
 * @param {any} json JSON object
 * @param {string} property Name of the property
 */
function checkPropertyExists(json, property) {
    if (!json.hasOwnProperty(property)) {
        console.log(`No ${property} property found in ${packageLockFilename}.`);
        process.exit(0); // exit without error
    }
    return json;
}

/**
 * Filter git dependencies by the presence of the `from` property in the given dependency object.
 * @param {any} json JSON object
 * @param {string} property Name of the property
 * @returns Returns a list of package names
 */
function findGitDependencies(dependencies) {
    // filter git dependencies by the presence of the `from` property
    const gitDependencies = Object.entries(dependencies).filter((entry) => entry[1].from).map((entry) => entry[0]);

    if(gitDependencies.length === 0) {
        console.log(`No git dependencies found in ${packageLockFilename}.`);
        process.exit(0); // exit without error
    }

    return gitDependencies;
}

/**
 * Remove the given package directory from the node_modules directory
 * @param {string} nodeModulesDir Path to the node_modules directory
 * @param {string} packageName Package name to remove
 */
function removePackage(nodeModulesDir, packageName) {
    return fsPromises.rmdir(`${nodeModulesDir}${sep}${packageName}`, {recursive: true}) // recursive requires Node.js v12.10+ (see https://nodejs.org/api/fs.html#fs_fspromises_rmdir_path_options)
        .then(() => {
            return packageName;
        })
        .catch((err) => {
            console.error(err.message);
            process.exit(1); // exit with error
        });
}

readJSONFile(packageLockFilename)
    .then((lockJSON) => checkPropertyExists(lockJSON, dependenciesProperty))
    .then((lockJSON) => {
        const gitDependencies = findGitDependencies(lockJSON[dependenciesProperty]);
        console.log(`The following dependencies will be removed from ${nodeModulesDir} and ${packageLockFilename}: `, gitDependencies);

        return Promise.all(gitDependencies.map((dep) => removePackage(nodeModulesDir, dep)))
            .then((removedPackages) => {
                removedPackages.forEach((dep) => {
                    delete lockJSON[dependenciesProperty][dep]; // mutates the lockJSON object!
                });
            })
            .then(() => lockJSON);
    })
    .then((newLockJSON) => writeJSONFile(packageLockFilename, newLockJSON))
    .then(() => {
        console.log(`${packageLockFilename} was saved successfully!`);
    });
