const fs = require('fs');
const log = (...messages) => messages.forEach(m => fs.appendFileSync('log', typeof m === 'string' ? m + '\n' : JSON.stringify(m) + '\n', 'utf-8'));

exports.find = function find() {

}
exports.find_autocomplete = function find_autocomplete(current, argv, done) {
  if(!argv._[2]) {
    done(['opentable']);
  } else {
    exports.find_autocomplete2(current, argv, done);
  }
}

exports.find_autocomplete2 = function find_autocomplete(current, argv, done) {
  if(!argv._[3]) {
    done(['ot-react-maps']);
  } else {
    done();
  }
}