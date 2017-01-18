/**
 * Created by Samuel Gratzl on 28.11.2016.
 */

const Promise = require('bluebird');
const path = require('path');
const fs = Promise.promisifyAll(require('fs-extra'));
const chalk = require('chalk');
const pkg = require('./package.json');
const argv = require('yargs-parser')(process.argv.slice(2));
const quiet = argv.quiet !== undefined;

const now = new Date();
const prefix = (n) => n < 10 ? ('0' + n) : n.toString();
const buildId = `${now.getUTCFullYear()}${prefix(now.getUTCMonth())}${prefix(now.getUTCDate())}-${prefix(now.getUTCHours())}${prefix(now.getUTCMinutes())}${prefix(now.getUTCSeconds())}`;
pkg.version = pkg.version.replace('SNAPSHOT', buildId);
const env = Object.assign({}, process.env);

function toRepoUrl(url) {
  return url.startsWith('https://github.com/') ? url : `https://github.com/${url}`;
}


function toRepoUrlWithUser(url) {
  const repo = toRepoUrl(url);
  const username_and_password = process.env.PHOVEA_GITHUB_CREDENTIALS;
  if (repo.includes(':') || !username_and_password) {
    return repo;
  }
  return repo.replace('://', `://${username_and_password}@`);
}


function fromRepoUrl(url) {
  if (url.includes('.git')) {
    return url.match(/\/(.*)\.git/)[0]
  }
  return url.slice(url.lastIndexOf('/') + 1);
}


/**
 * spawns a child process
 * @param cmd command as array
 * @param args arguments
 * @param opts options
 */
function spawn(cmd, args, opts) {
  const spawn = require('child_process').spawn;
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, opts);
    if (!quiet) {
      p.stdout.on('data', (data) => console.log(data.toString()));
      p.stderr.on('data', (data) => console.error(chalk.red(data.toString())));
    }
    p.on('close', (code) => code == 0 ? resolve() : reject(code));
  });
}


/**
 * run npm with the given args
 * @param cwd working directory
 * @param cmd the command to execute as a string
 * @return {*}
 */
function npm(cwd, cmd) {
  console.log(cwd, chalk.blue('running npm', cmd));
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return spawn(npm, (cmd || 'install').split(' '), {cwd, env});
}

/**
 * runs docker command
 * @param cwd
 * @param cmd
 * @return {*}
 */
function docker(cwd, cmd) {
  console.log(cwd, chalk.blue('running docker', cmd));
  return spawn('docker', (cmd || 'build .').split(' '), {cwd, env});
}

function dockerSave(image, target) {
  console.log(chalk.blue(`running docker save ${image} | gzip > ${target}`));
  const spawn = require('child_process').spawn;
  const opts = {env};
  return new Promise((resolve, reject) => {
    const p = spawn('docker', ['save', image], opts);
    const p2 = spawn('gzip', [], opts);
    p.stdout.pipe(p2.stdin);
    p2.stdout.pipe(fs.createWriteStream(target));
    if (!quiet) {
      p.stderr.on('data', (data) => console.error(chalk.red(data.toString())));
      p2.stderr.on('data', (data) => console.error(chalk.red(data.toString())));
    }
    p2.on('close', (code) => code == 0 ? resolve() : reject(code));
  });
}

function createQuietTerminalAdapter() {
  const TerminalAdapter = require('yeoman-environment/lib/adapter');
  const impl = new TerminalAdapter();
  impl.log.write = function () {
    return this;
  };
  return impl;
}

/**
 * runs yo internally
 * @param generator
 * @param options
 * @param cwd
 */
function yo(generator, options, cwd) {
  const yeoman = require('yeoman-environment');
  // call yo internally
  const yeomanEnv = yeoman.createEnv([], {cwd, env}, quiet ? createQuietTerminalAdapter() : undefined);
  yeomanEnv.register(require.resolve('generator-phovea/generators/' + generator), 'phovea:' + generator);
  const runYo = () => new Promise((resolve, reject) => {
    try {
      console.log(cwd, chalk.blue('running yo phovea:' + generator));
      yeomanEnv.run('phovea:' + generator, options, resolve);
    } catch (e) {
      console.error('error', e, e.stack);
      reject(e);
    }
  });
  // move my own .yo-rc.json to avoid a conflict
  return fs.renameAsync('.yo-rc.json', '.yo-rc_tmp.json')
    .then(runYo)
    .then(() => fs.renameAsync('.yo-rc_tmp.json', '.yo-rc.json'));
}

function cloneRepo(p, cwd) {
  // either of them has to be defined
  p.name = p.name || fromRepoUrl(p.repo);
  p.repo = p.repo || `phovea/${p.name}`;
  p.branch = p.branch || 'master';
  console.log(cwd, chalk.blue(`running git clone --depth 1 -b ${p.branch} ${toRepoUrl(p.repo)} ${p.name}`));
  return spawn('git', ['clone', '--depth', '1', '-b', p.branch, toRepoUrlWithUser(p.repo), p.name], {cwd});
}

function preBuild(p, dir) {
  const hasAdditional = p.additional.length > 0;
  let act = fs.emptyDirAsync(dir)
    .then(() => cloneRepo(p, dir));
  if (hasAdditional) {
    act = act
      .then(() => Promise.all(p.additional.map((pi) => cloneRepo(pi, dir))));
  }
  return act;
}

function loadComposeFile(dir, p) {
  const composeFile = `${dir}/${p.name}/deploy/docker-compose.partial.yml`;
  if (fs.existsSync(composeFile)) {
    const yaml = require('yamljs');
    return fs.readFileAsync(composeFile).then((content) => yaml.parse(content.toString()));
  } else {
    return Promise.resolve({});
  }
}

function patchComposeFile(p, composeTemplate) {
  const service = {};
  if (composeTemplate && composeTemplate.services) {
    const firstService = Object.keys(composeTemplate.services)[0];
    //copy data from first service
    Object.assign(service, composeTemplate.services[firstService]);
    delete service.build;
  }
  service.image = p.image;
  if (p.type === 'web' || p.type === 'static') {
    service.ports = ['80:80'];
  }
  const r = {
    version: '2.0',
    services: {}
  };
  r.services[p.label] = service;
  return r;
}

function postBuild(p, dir, buildInSubDir) {
  return Promise.resolve(null)
    .then(() => docker(`${dir}${buildInSubDir ? '/' + p.name : ''}`, `build -t ${p.image} -f deploy/Dockerfile .`))
    .then(() => argv.skipSaveImage ? null : dockerSave(p.image, `build/${p.label}_image.tar.gz`))
    .then(() => Promise.all([loadComposeFile(dir, p).then(patchComposeFile.bind(null, p))].concat(p.additional.map((pi) => loadComposeFile(dir, pi)))))
    .then(mergeCompose);
}

function buildWebApp(p, dir) {
  console.log(dir, chalk.blue('building web application:'), p.label);
  const name = p.name;
  const hasAdditional = p.additional.length > 0;
  let act = preBuild(p, dir);
  //let act = Promise.resolve(null);
  if (hasAdditional) {
    act = act
      .then(() => yo('workspace', {noAdditionals: true}, dir))
      .then(() => npm(dir, 'install'));
    //test all modules
    if (hasAdditional && !argv.skipTests) {
      act = act.then(() => Promise.all(p.additional.map((pi) => npm(dir, `run test:${pi.name}`))));
    }
    act = act
      .then(() => npm(dir, `run dist:${p.name}`));
  } else {
    act = act
      .then(() => npm(dir + '/' + name, 'install'))
      .then(() => npm(dir + '/' + name, 'run dist'));
  }
  return act
    .then(() => fs.renameAsync(`${dir}/${p.name}/dist/${p.name}.tar.gz`, `./build/${p.label}.tar.gz`))
    .then(postBuild.bind(null, p, dir, true));
}

function buildServerApp(p, dir) {
  console.log(dir, chalk.blue('building service package:'), p.label);
  const name = p.name;

  let act = preBuild(p, dir);
  act = act
    .then(() => yo('workspace', {noAdditionals: true}, dir));

  act = act
    .then(() => console.log(chalk.yellow('create test environment')))
    .then(() => npm(dir + '/' + name, 'run build'))
    .then(() => Promise.all(p.additional.map((pi) => npm(dir + '/' + pi.name, `run build`))));

  //copy all together
  act = act
    .then(() => fs.ensureDirAsync(`${dir}/build`))
    .then(() => fs.copyAsync(`${dir}/${name}/build/source`, `${dir}/build/`))
    .then(() => Promise.all(p.additional.map((pi) => fs.copyAsync(`${dir}/${pi.name}/build/source/*`, `${dir}/build/source/`))));

  //let act = Promise.resolve([]);

  //copy main deploy thing and create a docker out of it
  return act
    .then(() => fs.copyAsync(`${dir}/${name}/deploy`, `${dir}/`))
    .then(postBuild.bind(null, p, dir, false));
}

function buildImpl(d, dir) {
  switch (d.type) {
    case 'static':
    case 'web':
      return buildWebApp(d, dir);
    case 'api':
      d.name = d.name || 'phovea_server';
      return buildServerApp(d, dir);
    case 'service':
      return buildServerApp(d, dir);
    default:
      console.error(chalk.red('unknown product type: ' + d.type));
      return Promise.resolve(null);
  }
}

function mergeCompose(composePartials) {
  let dockerCompose = {};
  const _ = require('lodash');
  const mergeArrayUnion = (a, b) => Array.isArray(a) ? _.union(a, b) : undefined;
  composePartials.forEach((c) => _.mergeWith(dockerCompose, c, mergeArrayUnion));
  return dockerCompose;
}

function buildCompose(descs, composePartials) {
  const dockerCompose = mergeCompose(composePartials);
  const services = dockerCompose.services;
  // link the api server types to the web types and server to the api
  const web = descs.filter((d) => d.type === 'web').map((d) => d.label);
  const api = descs.filter((d) => d.type === 'api').map((d) => d.label);
  api.forEach((s) => {
    web.forEach((w) => {
      services[w].links = services[w].links || [];
      services[w].links.push(`${s}:api`);
    });
  });
  descs.filter((d) => d.type === 'service').forEach((s) => {
    api.forEach((w) => {
      services[w].links = services[w].links || [];
      services[w].links.push(`${s.label}:${s.name}`);
    });
  });
  const yaml = require('yamljs');
  return fs.writeFileAsync('build/docker-compose.yml', yaml.stringify(dockerCompose, 100, 2))
    .then(() => dockerCompose);
}

function pushImages(dockerCompose) {
  const dockerRepository = argv.pushTo;
  if (!dockerRepository) {
    return null;
  }
  const services = dockerCompose.services;

  //collect all images
  const images = [];
  Object.keys(services).map((s) => {
    const service = services[s];
    if (service.image) {
      images.push(service.image);
    }
  });

  const tags = images.map((image) => ({image, tag: `${dockerRepository}/${image}`}));
  if (argv.pushExtra) { //push additional custom prefix without the version
    tags.push(...images.map((image) => ({
      image,
      tag: `${dockerRepository}/${image.substring(0, image.lastIndexOf(':'))}:${argv.pushExtra}`
    })));
  }
  return Promise.all(tags.map((tag) => docker('.', `tag ${tag.image} ${tag.tag}`)))
    .then(() => Promise.all(tags.map((tag) => docker('.', `push ${tag.tag}`))));
}

if (require.main === module) {
  if (argv.skipTests) {
    // if skipTest option is set, skip tests
    console.log(chalk.blue('skipping tests'));
    env.PHOVEA_SKIP_TESTS = true;
  }
  if (argv.quiet) {
    // if skipTest option is set, skip tests
    console.log(chalk.blue('will try to keep my mouth shut...'));
  }
  const descs = require('./phovea_product.json');
  const singleService = descs.length === 1;
  const productName = pkg.name.replace('_product', '');

  fs.emptyDirAsync('build')
    .then(() => Promise.all(descs.map((d, i) => {
      d.additional = d.additional || []; //default values
      d.name = d.name || fromRepoUrl(d.repo);
      d.label = d.label || d.name;
      if (singleService) {
        d.image = `${productName}:${pkg.version}`;
      } else {
        d.image = `${productName}/${d.label}:${pkg.version}`;
      }
      let wait = buildImpl(d, './tmp' + i);
      wait.catch((error) => {
        d.error = error;
        console.error('ERROR building ', d, error);
      });
      return wait;
    })))
    .then((composeFiles) => buildCompose(descs, composeFiles.filter((d) => !!d)))
    .then(pushImages.bind(this))
    .then(() => {
      console.log(chalk.bold('summary: '));
      const maxLength = Math.max(...descs.map((d) => d.name.length));
      descs.forEach((d) => console.log(` ${d.name}${'.'.repeat(3 + (maxLength - d.name.length))}` + (d.error ? chalk.red('ERROR') : chalk.green('SUCCESS'))));
    });
}
