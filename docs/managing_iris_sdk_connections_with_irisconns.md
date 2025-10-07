# Managing External Language Connections with "irisconns"

While working with external languages for IRIS (such as Python and Node.js), one of the first things you must accomplish is making a connection to an IRIS instance.

For instance, to make a connection in python (from [https://pypi.org/project/intersystems-irispython/](https://pypi.org/project/intersystems-irispython/)):
```python
import iris

# Open a connection to the server
args = {
	'hostname':'127.0.0.1', 
	'port': 1972,
	'namespace':'USER', 
	'username':'username', 
	'password':'password'
}
conn = iris.connect(**args)

# Create an iris object
irispy = iris.createIRIS(conn)

# Create a global array in the USER namespace on the server
irispy.set("myGlobal", "hello world!") 
```

To establish a connection, you must either hard-code connection information in your script or you must prompt the user for the information.

To help manage these IRIS connections in my own projects, I created [irisconns](https://openexchange.intersystems.com/package/irisconns) on Open Exchange.

`irisconns` allows you to decouple your connection information from your project/code by allowing you to save that connection information into files that are separate from your code.  (Think "DSN" and "ODBC" for your IRIS Native SDK connections.)

## Getting Started

To get started with `irisconns`, create either an `irisconns` or `.irisconns` file in your project's working directory, any parent directory to your working directory, or your home directory.  Populate your `irisconns` file with connection information in an INI file format:

```ini
# 'default' is the connection returned if no name is provided.
[default]
hostname = localhost
port = 1972
namespace = USER
username = _SYSTEM
# confirm password? true or false?
confirm = false

# This connection name is "TEST".
[TEST]
hostname = test-server
port = 1972
namespace = USER
username = _SYSTEM
# confirm password? true or false?
confirm = false

# This connection name is "PROD".
[PROD]
hostname = prod-server
port = 1972
namespace = %SYS
username = _SYSTEM
# confirm password? true or false?
confirm = false
```

You will also need to copy the associated `irisconns.py` or `irisconns.js` libraries into your project so that you can import the `irisconns` module from your code. (Currently, only Python and Node.js libraries exist.)  You also need to install the IRIS native packages for your programming language:

```bash
# Install Dependencies for Python
cp /path/to/irisconns/irisconns.py ./irisconns.py
pip install intersystems-irispython

# Install Dependencies for Node.js
cp /path/to/irisconns/irisconns.js ./irisconns.js
npm install @intersystems/intersystems-iris-native
```

## Using "irisconns"
Once installed, you should be able to use/prompt for your connection configuration:

```python
# Python Connection Example
import irisconns

# default connection
irispy = irisconns.get_irispy()

# named connection
irispy = irisconns.get_irispy('TEST')

# usage
irispy.set('hello world!', 'test', 1)
```

```javascript
// Javascript Connection Example

// Import the package
const irisconns = require('./irisconns.js');

// Wrap in an async function so we can await the connection...
(async () => {
  // 'default' connection
  const iris = await irisconns.get_iris();

  // named (i.e. "PROD") connection
  // const iris = await irisconns.get_iris('PROD');

  // usage
  iris.set('hello world!','test',1);
})()
```

The above code will produce prompts, similar to the following:

```bash
# Connecting to default
Hostname    : localhost (default)
Port        : 11972
Namespace   : USER (default)
Username    : _SYSTEM
Password    : [hidden]
Confirm     : [hidden]
```

## Closing
You can find more information about `irisconns` on the [Open Exchange page](https://openexchange.intersystems.com/package/irisconns).  Hopefully you will find it useful!

Thanks!