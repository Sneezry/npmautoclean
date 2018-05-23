#!/usr/bin/env node
const fs = require('fs-plus');
const path = require('path');

const defaultIgnoreList = [
  '!LICENSE.md',
  '!License.md',
  '!license.md',
  '!/package.json',
  '/example.js',
  '/test.js',
  'Makefile',
  'Cakefile',
  'Gulpfile.js',
  'Gruntfile.js',
  'gruntfile.js',
  'gulpfile.js',
  '.DS_Store',
  '.tern-project',
  '.gitattributes',
  '.editorconfig',
  '.eslintrc',
  'eslint',
  '.eslintrc.js',
  '.eslintrc.json',
  '.eslintignore',
  '.stylelintrc',
  'stylelint.config.js',
  '.stylelintrc.json',
  '.stylelintrc.yaml',
  '.stylelintrc.yml',
  '.stylelintrc.js',
  '.htmllintrc',
  '.nvmrc',
  'htmllint.js',
  '.lint',
  '.npmignore',
  '.gitignore',
  '.jshintrc',
  '.gitmodules',
  '.zuul.yml',
  '.flowconfig',
  '.documentup.json',
  '.yarn-metadata.json',
  '.travis.yml',
  'appveyor.yml',
  '.eslintrc.yml',
  '.gitlab-ci.yml',
  '.clang-format',
  'circle.yml',
  '.coveralls.yml',
  '.dir-locals.el',
  'jsdoc.json',
  '.doclets.yml',
  '.dockerignore',
  'component.json',
  '.jscs.json',
  '.istanbul.yml',
  'CHANGES',
  'Changes',
  'changes',
  'CHANGELOG',
  'ChangeLog',
  'changelog',
  'package-lock.json',
  'AUTHORS',
  'Authors',
  'authors',
  'CONTRIBUTORS',
  'Contributors',
  'contributors',
  '.yarn-integrity',
  '.yarnclean',
  'yarn.lock',
  'bower.json',
  '_config.yml',
  '.babelrc',
  '.yo-rc.json',
  'jest.config.js',
  'karma.conf.js',
  '.appveyor.yml',
  'tsconfig.json',
  'typings.json',
  '.gitkeep',
  '.tm_properties',
  '.vimrc',
  '__tests__/',
  'test/',
  'tests/',
  'powered-test/',
  'docs/',
  'doc/',
  '.idea/',
  '.vscode/',
  '.vs/',
  'website/',
  'images/',
  'assets/',
  'example/',
  'examples/',
  'coverage/',
  '.nyc_output/',
  '.circleci/',
  '.github/',
  'typings/',
  '*.markdown',
  '*.md',
  '*.ts',
  '*.jst',
  '*.coffee',
  '*.tgz',
  '*.patch',
  '*.swp',
  '*.1',
  '*.njsproj',
  '*~'
];

const rootDir = process.cwd();
const moduleRootDir = path.join(rootDir, 'node_modules');

if (!fs.existsSync(moduleRootDir)) {
  console.log('No node modules found.');
  process.exit(0);
}

const npmignoreDir = path.join(__dirname, 'npmignore');

const moduleIgnoreList = fs.readdirSync(npmignoreDir);
const removeList = [];

function isIgnore(ignoreList, relativePath, isDirectory) {
  let ignore = false;

  relativePath = relativePath.replace(/[\\\/]+/g, '/');

  for (let rule of ignoreList) {
    const directoryRule = /\/$/.test(rule);

    if (directoryRule && !isDirectory || !directoryRule && isDirectory) {
      continue;
    }

    rule = rule.trim();

    const whiteList = /^!/.test(rule);

    if (whiteList) {
      rule = rule.substr(1);
    }

    rule = rule.replace(/\./g, '\.')
               .replace(/\*\*/g, '$$')
               .replace(/\*/g, '[^\/]*')
               .replace(/\//g, '\/')
               .replace(/\$\$/g, '.*')
               .replace(/\/$/, '');

    if (/^\//.test(rule)) {
      rule = rule.replace(/^\//, '^');
    } else {
      rule = '(^|\/)' + rule;
    }

    rule += '$';

    const re = new RegExp(rule);
    let matched = re.test(relativePath);

    if (whiteList && matched) {
      return false;
    }

    if (matched) {
      ignore = true;
    }
  }

  return ignore;
}

function checkIgnore(absolutePath, rootPath, ruleList) {
  const relativePath = absolutePath.substr(rootPath.length)
                                  .replace(/[\\\/]+/g, '/')
                                  .replace(/^\//, '')
                                  .replace(/\/$/, '');

  const isDirectory = fs.isDirectorySync(absolutePath);
  const ignore = isIgnore(ruleList, relativePath, isDirectory);
  if (ignore) {
    removeList.push(absolutePath);
  }

  if (!ignore && isDirectory) {
    const children = fs.listSync(absolutePath);
    children.forEach(item => {
      checkIgnore(item, rootPath, ruleList);
    });
  }
}

const moduleList = fs.readdirSync(moduleRootDir).filter(item => {
  return item !== '.bin';
});

moduleList.forEach(module => {
  const ignoreFilePath = path.join(npmignoreDir, module);

  module = path.join(moduleRootDir, module);

  const package = path.join(module, 'package.json');
  if (fs.existsSync(package)) {
    const version = require(package).version;
    const main = require(package).main;
    const _resolved = require(package)._resolved;
    const dependencies = require(package).dependencies;
    const devDependencies = require(package).devDependencies;
    const packageJson = {version,main,_resolved,dependencies,devDependencies};
    fs.writeFileSync(package, JSON.stringify(packageJson));
  }

  let ignoreList = defaultIgnoreList;

  if (fs.existsSync(ignoreFilePath)) {
    const ignoreFile = fs.readFileSync(ignoreFilePath, 'utf8').replace(/\r/g, '');
    const appendIgnoreList = ignoreFile.split('\n').filter(item => {
      return !!item.trim();
    });

    ignoreList = ignoreList.concat(appendIgnoreList);
  }

  const files = fs.listSync(module);

  files.forEach(item => {
    checkIgnore(item, module, ignoreList);
  });
});

console.log(`Removing ${removeList.length} items...`);

removeList.forEach(item => {
  fs.removeSync(item);
});

console.log('NPM autoclean finished.');
process.exit(0);