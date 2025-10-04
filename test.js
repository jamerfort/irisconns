const irisconns = require('./irisconns.js');


(async () => {
  const iris = await irisconns.get_iris();

  //const iris = await irisconns.get_iris('PROD');

  // usage
  iris.set('hello world!','test',1);
  console.log('>>> Value from IRIS: ', iris.get('test',1));
  iris.kill('test',1);
})()
