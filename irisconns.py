import configparser
import iris
import os

from dataclasses import dataclass
from getpass import getpass
from pathlib import Path

#########################################################################
# Globals and configs
#########################################################################

# Only "export" these items...
__all__ = [
  'set_irispy',
  'get_irispy',
  'set_conn',
  'Config',
]

# What is the default connection name?
# Use $CONN if provided...otherwise 'default'
DEFAULT_CONN = os.getenv('CONN') or 'default'

# Global for holding open connections by connection info key
_conns = {}

# Global for holding open connections by name
_irispys = {}

#########################################################################

class Password:
  """A class to mask a password when displaying to screen."""
  def __init__(self, val):
    self._value = val

  def __str__(self):
    """Return the value when treated as a string."""
    return self._value

  def __repr__(self):
    """Mask the value when displaying the object."""
    return '****'

@dataclass
class Prompt:
  """A class for defining the prompted fields."""
  key: str
  label: str = None
  default: str = None
  mask: bool = False

  label_width: int = 12

  def print(self, value):
    """Print this prompt's label with the given value."""

    # Mask, if this prompt is maskable
    if self.mask:
      value = '****'
    
    # Indicate if the value matches the default
    if value == self.default:
      default_str = ' (default)'
    else:
      default_str = ''

    print(f'{self.label:{self.label_width}}: {value}{default_str}')

  def _prompt(self, confirm=True):
    """Prompt the user for the value of this field."""

    # Loop through until valid entry is given.
    while True:
      print(f'{self.label:{self.label_width}}: ', end='', flush=True)

      # If this is maskable, use getpass() instead of input()
      if self.mask:
        val = getpass('')

        # Do we need to prompt for a confirmation of the previously typed value?
        if confirm:
          print(f'{"Confirm":{self.label_width}}: ', end='', flush=True)
          val2 = getpass('')

          # Don't match
          if val != val2:
            print("Values don't match. Try again.")
            continue
        
      # Not maskable, so use input()
      else:
        val = input('')

      # Clean up whitespace
      val = val.strip()

      # If a blank value was entered and this has a default, return the default
      if val == '' and self.default != None:
        return self.default

      # If a value was provided, return it
      if val:
        return val

    # Return the default. We should never get here
    return self.default

  def prompt(self, confirm=True):
    """Prompt the user for the value of this field. Wrap maskable values in Password() class."""
    val = self._prompt(confirm)

    # Wrap passwords in a Password, so we can mask when displaying
    if self.mask:
      return Password(val)

    return val

######################################################################
# Define prompts/fields
######################################################################
MASK=True
NOMASK=False

_prompts = (
  Prompt('hostname' , 'Hostname' , 'localhost', NOMASK),
  Prompt('port'     , 'Port'     , '1972'     , NOMASK),
  Prompt('namespace', 'Namespace', 'USER'     , NOMASK),
  Prompt('username' , 'Username' , ''         , NOMASK),
  Prompt('password' , 'Password' , ''         , MASK),
)
######################################################################

@dataclass
class Config:
  """Class for holding a connection configuration for IRIS."""
  hostname: str
  port: str
  namespace: str
  username: str
  password: str

  # Should we prompt for password confirmation?
  confirm: bool = True

  # Has this config been "filled-in" by the user?
  _filled: bool = False

  def __init__(self, hostname='localhost', port='1972', namespace='USER', username=None, password=None, confirm=True):
    self.hostname = hostname
    self.port = port
    self.namespace = namespace
    self.username = username
    self.confirm = confirm

    if password:
      self.password = Password(password)
    else:
      self.password = None


  def _key(self):
    """Return the key used to save connections by."""
    return ';'.join([str(f) for f in [self.hostname, self.port, self.namespace, self.username]])

  def fill(self):
    """Prompt the user for any missing fields."""

    for prompt in _prompts:
      val = getattr(self, prompt.key, None)

      # We're good, skip to the next
      if val:
        prompt.print(val)
        continue

      setattr(self, prompt.key, prompt.prompt(confirm=self.confirm))

    self._filled = True

  def get_connection(self):
    """Get an irispy connection for this configuration, prompting for info as needed."""

    # Preliminary check
    key = self._key()
    if key in _conns:
      return _conns[key]

    # Let's prompt for any missing fields
    if not self._filled:
      self.fill()

    # Recalculate the key.
    # Make the connection if this is the first time we've seen this key.
    key = self._key()
    if key not in _conns:
      _conns[key] = self._make_connection()

    return _conns[key]

  def _make_connection(self):
    """Take the config values and create an irispy connection."""

    config = {
      'hostname': self.hostname,
      'port': int(self.port),
      'namespace': self.namespace,
      'username': self.username,
      'password': str(self.password),
    }

    conn = iris.connect(**config)
    irispy = iris.createIRIS(conn)

    return irispy

class FileParser:
  """Class for reading .irisconns/irisconns files from this directory, up through all parent directories,
     and finally ~/.irisconns and ~/irisconns."""

  @classmethod
  def find_dirs(cls):
    """Which directories may contain .irisconns or irisconns files?"""
    cwd = Path.cwd()
    yield cwd

    for p in reversed(cwd.parents):
      yield p

    yield Path.home()

  @classmethod
  def find_files(cls):
    """Yield .irisconns files that actually exist as files"""
    for d in cls.find_dirs():
      f = d / 'irisconns'
      if f.is_file():
        yield f

      f = d / '.irisconns'
      if f.is_file():
        yield f

  @classmethod
  def load_config(cls, name=DEFAULT_CONN):
    """Return a Config matching the given (or default) connection name.  Return None if not found."""
    config = configparser.ConfigParser(interpolation=None)

    for f in cls.find_files():
      config.read(f)
      if name in config:
        section = config[name]

        # Read values from section
        # TODO: have Prompt class do this?
        hostname = section.get('hostname', 'localhost')
        port = section.get('port', '1972')
        namespace = section.get('namespace', 'USER')
        username = section.get('username', '')
        confirm = section.get('confirm', 'true')

        # normalize boolean
        if confirm.strip().lower() in ['false', 'no', 'off', 'f', 'n', '0']:
          confirm = False
        else:
          confirm = True

        # Return the config
        return Config(hostname=hostname, port=port, namespace=namespace, username=username, confirm=confirm)

    return None

def set_irispy(irispy, name=DEFAULT_CONN):
  """Set an irispy connection for the given name."""
  global _irispys
  _irispys[name] = irispy
  return irispy

def get_irispy(name=DEFAULT_CONN):
  """Get (or create) an irispy connection with the given name."""
  if name in _irispys:
    return _irispys[name]

  fp = FileParser()
  config = fp.load_config(name)

  if config != None:
    print(f'# Connecting to {name}')
    irispy = config.get_connection()
    _irispys[name] = irispy
    return irispy

  raise KeyError(f'irispy for "{name}" not defined')

def set_conn(config, name=DEFAULT_CONN):
  """Create a connection for name, using the given config."""
  irispy = config.get_connection()
  return set_irispy(irispy, name)
