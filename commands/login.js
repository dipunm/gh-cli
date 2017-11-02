const GitHubApi = require('github')
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(process.env.HOME, '/.ghub-cli');
const github = new GitHubApi({
  //debug: true,
  Promise: require('bluebird')
});
const reqScopes = ['user', 'public_repo', 'repo', 'repo:status', 'gist'];


// create token by user / pass
// $cmd login username
//
// create token by browser
// $cmd login --browser
//
// login by token authentication
// $cmd login -t 938rhhgt93r09/rjgf9==

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
      saveToConfig(token);
      console.log('successfully logged in as:', args.username);
    });
  } else if (args.t) {
    github.authenticate({
      type: 'token',
      token: args.t
    });

    getUsername((err, username) =>  {
      if (err) {
        console.error('unable to log in with the provided token.')
        return;
      }

      saveToConfig(args.t);
      console.log('successfully logged in as:', username)
    });
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
      note: 'ghub-cli (node) (created: ' + new Date().toISOString() + ')',
    };
    authorize(payload, done);
  });
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
  getTwoFactorCode(code => {
    payload.headers = payload.headers || [];
    payload.headers['X-GitHub-OTP'] = code;
    authorize(payload, done);
  })
}

function getTwoFactorCode(done) {
  inquirer.prompt(
    [
        {
            type: 'input',
            message: 'Enter your two-factor code',
            name: 'otp'
        }
    ]).then(function (answers) {
      done(answers.otp);
    });
}


exports.login = login;