# irisconns
## Create IRIS connections from configuration files

`irisconns` was created to help manage IRIS connections in your project using configuration files instead of hard-coding the configuration information in your project.

`irisconns` looks in `irisconns` or `.irisconns` files for connection information.

If a connection has been previously requested, the new request will return the existing connection.

## InterSystems External Languages Contest: .Net, Java, Python, JavaScript - 2025
`irisconns` was originally created/published for the [InterSystems External Languages Contest: .Net, Java, Python, JavaScript - 2025](https://community.intersystems.com/post/intersystems-external-languages-contest-net-java-python-javascript).


## Finding irisconns Files
`irisconns` looks in the following directories:

1. Current Directory
2. Parent Directories
3. Home Directory

In each directory, `irisconns` looks for the following files:
1. `irisconns`
2. `.irisconns`

The first file that contains a section for the given connection name will be loaded.  Any missing information will be gathered by prompting the user for more information.

## Example irisconns File
```ini
# 'default' is the connection returned if no name is provided.
[default]
hostname = localhost
port = 11972
namespace = USER
username = _SYSTEM

# This connection name is "TEST".
[TEST]
hostname = test-server
port = 1972
namespace = USER
username = _SYSTEM
confirm = false

# This connection name is "PROD".
[PROD]
hostname = prod-server
port = 1972
namespace = %SYS
username = _SYSTEM
```

## irisconns Keys

The following keys can be set for each connection in an `irisconns` file.  Any missing/required keys will be prompted to the user.

| Key     | Description | Example Values |
|---------|-------------|----------------|
|hostname   | Server name/IP of the connection |
|port     | Port number for the connection|
|namespace| Namespace being connected to |
|username | User name |
|confirm  | Should we confirm passwords? | false, no, off, f, n, 0,<br/> true, yes, on, t, y, 1

## Python - Installation and Example
Save `irisconns.py` to your PYTHONPATH so that you can import the `irisconns` module.

This module requires the IRIS Python SDK:
```bash
pip install intersystems-irispython
```

Example usage:
```python
import irisconns

# default connection
irispy = irisconns.get_irispy()

# named connection
irispy = irisconns.get_irispy('TEST')

# usage
irispy.set('hello world!', 'test', 1)
print(f'>>> Value from IRIS: {irispy.get("test", 1)}')
irispy.kill('test', 1)
```

## JavaScript - Installation and Example
Save `irisconns.js` to your project so that you can require the `irisconns.js` package.

This module requires the IRIS JavaScript SDK:
```bash
npm install @intersystems/intersystems-iris-native
```

Example usage:
```javascript
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
  console.log('>>> Value from IRIS: ', iris.get('test',1));
  iris.kill('test',1);
})()
```

## Demo
To demo `irisconns`, run the following docker compose command to start up a generic IRIS instance and build the demo images:

```bash
docker compose up
```

To run the python demo:
```bash
docker run -it --rm --network irisconns_default irisconns-irispy python demo.py
```
