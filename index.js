#!/usr/bin/env node
const commands = require('./commands');

const yargs = require('yargs')
  .usage('$0 <cmd> [args]')
  .command('hello [name]', 'welcome ter yargs!', (yargs) => {
      yargs.positional('name', {
        type: 'string',
        default: 'Cambi',
        describe: 'the name to say hello to'
      })
    }, function (argv) {
      console.log('hello', argv.name, 'welcome to yargs!')
    })
  .command('completion-script', 'prints the completion script that you can use to enable automatic completion', (yargs) => {
      yargs.positional('name', {
        type: 'string',
        default: '~/.bash_profile',
        describe: 'the file that should be appended to enable automatic completion',
        handler: (argv) => {
          yargs.showCompletionScript();
        }
      });
    })
  .command('login [username]', 'login', (yargs) => {
      yargs
      .usage('$0 login <username>')
      .usage('$0 login --token <token>')
      .usage('$0 login --browser')
      .positional('username', {
        type: 'string',
        describe: 'the username that you would like to use to log into github'
      })
      .group(['token', 'browser'], 'Options:')
      .group(['help', 'version'], 'Misc:')
      .option('token', {
        alias: 't',
        describe: 'supply a pre-defined token for ghub-cli to use',
        type: 'string'
      })
      .option('browser', {
        alias: 'b',
        describe: 'create a new token via the github website',
        type: 'boolean'
      })
      .implies('token', ['--no-browser', '--no-username'])
      .implies('browser', ['--no-token', '--no-username'])
      .implies('username', ['--no-token', '--no-browser'])
    })
  .help()
  .argv;

switch(yargs._[0]) {
  case 'login':
    commands.login(yargs);
    break;
}