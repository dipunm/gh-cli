const GitHubApi = require('github')
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const opn = require('opn');

const CONFIG_FILE = path.join(process.env.HOME, '/.ghub-cli');
const github = new GitHubApi({
  //debug: true,
  Promise: require('bluebird')
});
const reqScopes = ['user', 'public_repo', 'repo', 'repo:status', 'gist'];

function saveToConfig(token) {
  fs.openSync(CONFIG_FILE, 'a');
  let conf = fs.readFileSync(CONFIG_FILE, { encoding: 'UTF-8',  });
  if (!conf) {
    conf = '{}';
  }
  conf = JSON.parse(conf);

  conf.token = token;

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(conf), { encoding: 'UTF-8' });
}

function completeVerifyAndSaveLogin(token) {
  github.authenticate({
    type: 'token',
    token: token
  });

  getUsername((err, username) =>  {
    if (err) {
      console.error('unable to log in with the provided token.')
      return;
    }

    saveToConfig(token);
    console.log('successfully logged in as:', username)
  });
}


function login(args) {
  if(args.username) {
    loginBasic(args.username, (err, token) => {
      if (err) {
        if(err.message[0] === '{') {
          err = JSON.parse(err.message);
        }
        console.error(err.message);
        return;
      }

      completeVerifyAndSaveLogin(token);
    });
  } else if (args.token) {
    completeVerifyAndSaveLogin(args.token);
  } else if (args._[1] === 'browser') {
    opn('https://github.com/settings/tokens/new?scopes=' + encodeURIComponent(reqScopes.join(',')) + '&description=' + encodeURIComponent(makeTokenDescription()), {wait: false});
    getTokenFromUser((err, token) => {
      completeVerifyAndSaveLogin(token);
    })
  }
}

function getUsername(done) {
  github.users.get({}, function(err, res) {
    if(!err && (!res.data || !res.data.login)) {
      console.log(res);
        err = 'Unable to authenticate with the provided token.'
    }

    done(err, res && res.data && res.data.login);
  });
}

function loginBasic(username, done) {
  inquirer.prompt({
    type: 'password',
    name: 'password',
    message: 'Enter your password: '
  }).then(answers => {
    const password = answers.password;

    github.authenticate({
      type: 'basic',
      username: username,
      password: password
    });

    const payload = {
      scopes: reqScopes,
      note: makeTokenDescription(),
    };
    authorize(payload, done);
  });
}

function makeTokenDescription() {
  return 'ghub-cli (node) (created: ' + new Date().toISOString() + ')'
}

function requiredTwoFactor(err) {
  return err.message && err.message.indexOf('OTP') > 0;
}

function missingTwoFactorCode(payload) {
  return !payload.headers || !payload.headers['X-GitHub-OTP']
}

function authorize(payload, done) {
  github.authorization.create(
    payload,
    function (err, res) {
      if(err && missingTwoFactorCode(payload) && requiredTwoFactor(err)) {
        attemptTwoFactorAuthentication(payload, done);
      } else {
        done(err, res && res.data && res.data.token);
      }
   })
}

function attemptTwoFactorAuthentication(payload, done) {
  getTwoFactorCodeFromUser((err, code) => {
    payload.headers = payload.headers || [];
    payload.headers['X-GitHub-OTP'] = code;
    authorize(payload, done);
  })
}

function getTwoFactorCodeFromUser(done) {
  inquirer.prompt(
    [
        {
            type: 'input',
            message: 'Enter your two-factor code',
            name: 'otp'
        }
    ]).then(function (answers) {
      done(null, answers.otp);
    });
}

function getTokenFromUser(done) {
  inquirer.prompt(
    [
        {
            type: 'input',
            message: 'Enter your new token id',
            name: 'token'
        }
    ]).then(function (answers) {
      done(null, answers.token);
    });
}


exports.login = login;