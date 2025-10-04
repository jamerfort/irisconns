const irisnative = require('@intersystems/intersystems-iris-native')

const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');
const stream = require('stream');

const { open } = require('node:fs/promises');

//########################################################################
// Globals and configs
//########################################################################

// What is the default connection name?
// Use $CONN if provided...otherwise 'default'
const DEFAULT_CONN = process.env.CONN || 'default';

// Global for holding open connections by connection info key
let _conns = {}

// Global for holding open connections by name
let _irises = {}

//#######################################################################

// A class for defining the prompted fields.
class Prompt {
  label_width = 12;

  constructor(key, label, default_value, mask=false) {
    this.key = key;
    this.label = label;
    this.default_value = default_value;
    this.mask = mask;
  }

  #pad(value, width, pad_left=false) {
    let n = width - value.length;
    if (n <= 0) {
      return value;
    }

    let pad = (new Array(n + 1)).join(' ');

    return pad_left ? pad + value : value + pad;
    
  }

  #print_with_label(right_side) {
    let label = this.#pad(this.label, this.label_width);
    process.stdout.write(label + ': ' + (right_side || ''));
  }

  // Print this prompt's label with the given value.
  print(value) {
    // Mask if this prompt is maskable
    value = this.mask ? '****' : value;

    // Indicate if the value matches the default
    let default_str = (value == this.default) ? ' (default)' : '';

    this.#print_with_label(value + default_str + '\n');
  }

  // Read user password (without echoing input)
  #getpass(label) {
    return this.#input(label, true);
  }

  // Read user input
  async #input(label, muted=false) {

    let mutableStdout = new stream.Writable({
      write: function(chunk, encoding, callback){
        if (!this.muted) {
          process.stdout.write(chunk, encoding);
        } else {
          if (chunk.includes('\n')){
            process.stdout.write('\n');
          }
        }
        callback();
      }
    });

    const rl = readline.createInterface({
      input: process.stdin,
      output: mutableStdout,
      terminal: true,
    });

    function ask(query) {
      let p = new Promise(resolve => rl.question(query, (val) => {
        rl.close();
        resolve(val);
      }));

      mutableStdout.muted = muted;

      return p;
    }

    let padded_label = label == '' ? '' : this.#pad(label || '', this.label_width) + ': ';
    return await ask(padded_label);
  }

  // Prompt the user for the value of this field.
  async #prompt(confirm=true) {
    // Loop through until valid entry is given.
    while (true) {
      //this.#print_with_label('');

      let val;

      // If this is maskable, use getpass() instead of input()
      if (this.mask) {
        val = await this.#getpass(this.label);

        // Do we need to prompt for a confirmation of the previously typed value?
        if (confirm) {
          let val2 = await this.#getpass('Confirm');

          // Don't match
          if (val != val2) {
            process.stdout.write("Values don't match. Try again.\n");
            continue;
          }
        } // confirm?

      } else { // !this.mask
        val = await this.#input(this.label);
      }

      // Clean up whitespace
      val = val.trim();

      // If a blank value was entered and this has a default, return the default
      if (val == '' && this.default != undefined) {
        return this.default;
      }

      // If a vale was provided, return it
      if (val != '') {
        return val;
      }
    } // while

    // Return the default.  We should never get here
    return this.default;
  }

  // Prompt the user for the value of this field. Wrap maskable values in Password() class.
  prompt(confirm=true) {
    let val = this.#prompt(confirm);

    // Wrap passwords in a Password, so we can mask when displaying
    if (this.mask) {
      // TODO: Wrap with Password
    }

    return val;
  }
}

//#####################################################################
// Define prompts/fields
//#####################################################################
const MASK=true
const NOMASK=false

const _prompts = [
  new Prompt('hostname' , 'Hostname' , 'localhost', NOMASK),
  new Prompt('port'     , 'Port'     , '1972'     , NOMASK),
  new Prompt('namespace', 'Namespace', 'USER'     , NOMASK),
  new Prompt('username' , 'Username' , ''         , NOMASK),
  new Prompt('password' , 'Password' , ''         , MASK),
];
//#####################################################################

class Config {
  // Hide password as a private field with #
  #password;
  #filled;

  constructor({hostname='localhost', port='1972', namespace='USER', username=null, password=null, confirm=true} = {}) {
    this.hostname = hostname;
    this.port = port;
    this.namespace = namespace;
    this.username = username;
    this.confirm = confirm;

    // Hide password as a private field with #
    this.#password = password;

    this.#filled = false;
  }

  toString() {
    return `Config(hostname=${this.hostname}, port=${this.port}, namespace=${this.namespace}, username=${this.username}, ***, confirm=${this.confirm})`;
  }

  // Return the key used to save connections by.
  #key() {
    return [this.hostname, this.port, this.namespace, this.username].join(';');
  }

  // Prompt the user for any missing fields.
  async fill() {
    for (let idx in _prompts) {
      let prompt = _prompts[idx];
      let val = this[prompt.key];
      
      // We're good, skip to the next
      if (val) {
        prompt.print(val);
        continue;
      }

      this[prompt.key] = await prompt.prompt(this.confirm);
    }

    this.#filled = true;
  }

  // Get an irispy connection for this configuration, prompting for info as needed.
  async get_connection() {
    // Preliminary check
    let key = this.#key();
    if (key in _conns) {
      return _conns[key];
    }

    // Let's prompt for any missing fields
    if (!this.#filled) {
      await this.fill();
    }

    // Recalculate the key.
    // Make the connection if this is the first time we've seen this key.
    key = this.#key();
    if (!(key in _conns)) {
      _conns[key] = this.#make_connection();
    }

    return _conns[key];
  }

  // Take the config values and create an irispy connection.
  #make_connection() {
    let config = {
      host: this.hostname,
      port: parseInt(this.port),
      ns: this.namespace,
      user: this.username,
      pwd: this.password,
    };

    let conn = irisnative.createConnection(config);
    let iris = conn.createIris();

    return iris;
  }
  
}

// Class for reading .irisconns/irisconns files from this directory,
// up through all parent directories, and finally ~/.irisconns and ~/irisconns.
class FileParser {

  // Which directories may contain .irisconns or irisconns files?
  static find_dirs() {
    let dirs = [];

    let parts = process.cwd().split(path.sep);

    while (parts.length > 0) {
      let this_path = parts.join(path.sep);
      if (this_path != '') {
        dirs.push(parts.join(path.sep));
      }

      parts.pop();
    }

    dirs.push(os.homedir());

    return dirs;
  }

  // Yield .irisconns files that actually exist as files
  static find_files() {
    return this.find_dirs()
            // Check each dir for ./irisconns or ./.irisconns
            .flatMap(d => [
              [d, 'irisconns'].join(path.sep),
              [d, '.irisconns'].join(path.sep),
            ])

            // Only return existing files
            .filter(f => fs.existsSync(f) && fs.lstatSync(f).isFile() );
  }

  // Return a Config matching the given (or default) connection name.  Return null if not found."""
  static async load_config(name) {
    name = name || DEFAULT_CONN;

    let files = this.find_files();
    let config = null;

    for (let i in files) {
      let filepath = files[i];
      let file = await open(filepath);


      for await (let line of file.readLines()) {
        line = line.trim();

        if (line == '') {
          continue
        }

        // start of desired section
        if (line == `[${name}]`) {
          config = new Config();
          continue
        }

        // ignore lines if we're not in our desired section
        if (config == null) {
          continue
        }

        // start of a new section, return our config
        if (line[0] == '[') {
          return config;
        }

        // Skip lines that don't match "key = value" format.
        let eq = line.indexOf('=');
        if (eq == -1) {
          continue
        }

        let key = line.substring(0,eq).trim();
        let value = line.substring(eq+1).trim();

        switch (key) {
          case 'hostname':
          case 'port':
          case 'namespace':
          case 'username':
            config[key] = value;
            break;

          // booleans
          case 'confirm':
            switch (value.toLowerCase()) {
              case 'false':
              case 'no':
              case 'off':
              case 'f':
              case 'n':
              case '0':
                config[key] = false;
                break;

              default:
                config[key] = true;
                break;
            }
            break;
        }

      }

      // Return if config was populated; don't read next file;
      if (config != null) {
        return config;
      }
    }

    return config;
  }
}

// Set an iris connection for the given name.
function set_iris(name, iris) {
  return _irises[name || DEFAULT_CONN] = iris;
}

// Get (or create) an iris connection with the given name.
async function get_iris(name) {
  name = name || DEFAULT_CONN;

  let iris = _irises[name];
  if (iris) {
    return iris;
  }

  let config = await FileParser.load_config(name);
  if (config != null) {
    console.log(`# Connecting to ${name}`);
    iris = await config.get_connection();
    _irises[name] = iris;
    return iris;
  }

  throw new Error(`iris for "${name}" not defined`);
}

// Create a connection for name, using the given config.
async function set_conn(config, name) {
  let iris = await config.get_connection()
  return set_iris(iris, name);
}

function close_connection() {
  // TODO: Implement
}

// Exports ##############################################################
module.exports = {
  get_iris,
  set_iris,
  set_conn,
  close_connection,
  Config,
};
