#!/usr/bin/env node
const fs = require('fs-plus');
const parser = require('gitignore-parser');
const path = require('path');

const rootDir = process.cwd();
const moduleRootDir = path.join(rootDir, 'node_modules');

if (!fs.existsSync(moduleRootDir)) {
  console.log('No node modules found.');
  process.exit(0);
}

const npmignoreDir = path.join(moduleRootDir, '@npmignore');

if (!fs.existsSync(npmignoreDir)) {
  console.log('No npmignore modules found. To install npmignore module, try to run npm install @npmignore/<module> --save');
  process.exit(0);
}

const moduleIgnoreList = fs.readdirSync(npmignoreDir);
const removeList = [];

moduleIgnoreList.forEach(module => {
  const moduleDir = path.join(moduleRootDir, module).replace(/[\\\/]+/g, '/');
  if (!fs.existsSync(moduleDir)) {
    return;
  }

  const ignoreFilePath = path.join(npmignoreDir, module, 'npmignore');
  const ignore = parser.compile(fs.readFileSync(ignoreFilePath, 'utf8'));

  const files = fs.listTreeSync(moduleDir);
  const rootPathLength = moduleDir.length;

  files.forEach(file => {
    file = file.replace(/[\\\/]+/g, '/');
    const relativePath = file.substr(rootPathLength);
    if (ignore.denies(relativePath)) {
      removeList.push(file);
    }
  });

});

const moduleList = fs.readdirSync(moduleRootDir).filter(item => {
  return item !== '.bin';
});

moduleList.forEach(module => {
  module = path.join(moduleRootDir, module);

  const index = path.join(module, 'index.js');
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

  const ignore = path.join(module, '.npmignore');
  if (fs.existsSync(ignore)) {
    removeList.push(ignore);
  }

  const list = fs.readdirSync(module);
  for (let item of list) {
    if (item.toLowerCase() === 'readme.md' || item.toLowerCase() === 'readme') {
      removeList.push(path.join(module, item));
    }
  }
});

console.log(`Removing ${removeList.length} items...`);

removeList.forEach(item => {
  fs.removeSync(item);
});

console.log('NPM autoclean finished.');
process.exit(0);