'use strict'

const Promise = require('bluebird')
const spawn = require('child_process').spawn;
const fs = require('fs')
Promise.promisifyAll(fs);
const template = require('lodash/template')
const path = require('path')

const orgrepo = process.argv[2]
const repo = orgrepo.split('/')[1]

new Promise(function (resolve, reject) {
  const child = spawn('git', ['clone', 'https://github.com/' + orgrepo + '.git', repo])
  child.on('close', function (returnCode) {
    if (returnCode !== 0) {
      return reject(command + ' failed: ' + returnCode)
    }
    resolve()
  })
})
  .then(function () {
    return Promise.join(
    fs.readFileAsync(__dirname + '/LICENSE-template', 'utf8'),
    fs.readFileAsync(repo + '/README.md', 'utf8'),
    new Promise(function (resolve, reject) {
      const child = spawn('/bin/bash', ['-c', 'git -C ' + repo + ' log --format=%cd --date=format:%Y --reverse | head -1'])
      var buff = '';
      child.on('close', function (returnCode) {
        if (returnCode !== 0) {
          return reject(command + ' failed: ' + returnCode)
        }
        resolve(buff)
      })
      child.stdout.on('data', function (data) {
        buff = buff + data
      });
    })
    )
  })
  .spread(function (licenseTemplate, README, firstYear) {
    var years = [(new Date()).getFullYear()]
    firstYear = +(firstYear.toString())
    if (firstYear !== years[0]) {
      years.unshift(firstYear)
    }
    var pjson = require(process.cwd() + '/' + repo + '/package.json')
    pjson.license = 'Apache-2.0'
    pjson.author = 'The Hoodie Community and other contributors | http://hood.ie/'
    return Promise.join(
      fs.writeFileAsync(repo + '/LICENSE', template(licenseTemplate)({year: years.join('-')})),
      fs.writeFileAsync(repo + '/package.json', JSON.stringify(pjson, null, 2)),
      fs.writeFileAsync(repo + '/README.md', README.toString() + '\n\n## License\n\n[Apache 2.0](http://www.apache.org/licenses/LICENSE-2.0)\n')
    )
  })
