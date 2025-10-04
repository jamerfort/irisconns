const irisconns = require('./irisconns.js');
const fs = require('fs');

//////////////////////////////////////////////////////////////////////////

const default_text = `
[default]
hostname = iris
port = 1972
namespace = USER
username = _SYSTEM

# Use Password 'SYS'
`

const user_text = `
[USER_NS]
hostname = iris
port = 1972
namespace = IRISAPP
username = _SYSTEM
confirm = no

# Note this configuration does not ask
# you to confirm the password.
#
# Use Password 'SYS'
`

const irisapp_text = `
[IRISAPP_NS]
hostname = iris
port = 1972
namespace = IRISAPP

# This prompts for username, since it was
# not provided in the configuration.
# 
# Use User '_SYSTEM'
# Use Password 'SYS'
`

const generic_text = `
[GENERIC]
hostname = iris

# This uses the default port and namespace,
# since they were not provided in the configuration.
# 
# Use User '_SYSTEM'
# Use Password 'SYS'
`

// Write the config to irisconns file
filedata = [default_text, user_text, irisapp_text, generic_text].join('\n')
fs.writeFileSync('irisconns', filedata);

//////////////////////////////////////////////////////////////////////////

async function sleep(seconds) {
  const ms = seconds * 1000;

  return new Promise(resolve => {
    setTimeout(resolve, ms)
  });
}

async function pause() {
  return sleep(2);
}

async function run_scenario(name, irisconn_text) {
  console.log('#########################################################');
  console.log(`# Let's use the '${name}' connection from the 'irisconns' file:`);
  await sleep(.5);

  console.log(irisconn_text);

  let iris = null;

  if (name == 'default') {
    console.log(`# let iris = await irisconns.get_iris()`);
    iris = await irisconns.get_iris();
  } else {
    console.log(`# let iris = await irisconns.get_iris("${name}")`);
    iris = await irisconns.get_iris(name);
  }

  console.log('>>> Got connection!');
  await sleep(.5);

  console.log(">>> Setting global ^test(1)");
  iris.set(`hello world from a "${name}" connection`, 'test', 1);
  await sleep(.5);

  console.log(">>> Getting global...");
  value = iris.get('test', 1);
  console.log(`>>> Value from IRIS: ${value}`);
  await sleep(.5);

  console.log(">>> Killing global");
  iris.kill('test', 1);
  await pause();

  console.log('');
}

(async () => {
  await run_scenario('default', default_text);
  await run_scenario('USER_NS', user_text);
  await run_scenario('IRISAPP_NS', irisapp_text);
  await run_scenario('GENERIC', generic_text);

  console.log("Let's try to reconnect using the IRISAPP_NS connection again.")
  console.log("Notice that it will not prompt you for information this time.")
  await pause()
  await run_scenario('IRISAPP_NS', irisapp_text)
})()
