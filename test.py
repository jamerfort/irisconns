import irisconns

# default connection
irispy = irisconns.get_irispy()

# named connection
irispy = irisconns.get_irispy('TEST')

# usage
irispy.set('hello world!', 'test', 1)
print(f'>>> Value from IRIS: {irispy.get("test", 1)}')
irispy.kill('test', 1)
