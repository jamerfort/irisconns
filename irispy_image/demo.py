import irisconns
import time

default_text = '''
[default]
hostname = iris
port = 1972
namespace = USER
username = _SYSTEM

# Use Password 'SYS'
'''

user_text = '''
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
'''

irisapp_text = '''
[IRISAPP_NS]
hostname = iris
port = 1972
namespace = IRISAPP

# This prompts for username, since it was
# not provided in the configuration.
# 
# Use User '_SYSTEM'
# Use Password 'SYS'
'''

generic_text = '''
[GENERIC]
hostname = iris

# This uses the default port and namespace,
# since they were not provided in the configuration.
# 
# Use User '_SYSTEM'
# Use Password 'SYS'
'''

with open('irisconns', 'w') as f:
  for chunk in [default_text, user_text, irisapp_text, generic_text]:
    f.write(chunk + '\n')


def pause():
  print(f'\n[Type enter to continue]')
  input()

def run_scenario(name, irisconn_text):
  print('#########################################################')
  print(f"# Let's use the '{name}' connection from the 'irisconns' file:")
  time.sleep(.5)

  print(irisconn_text)

  if name == 'default':
    print(f'# irispy = irisconns.get_irispy()')
    irispy = irisconns.get_irispy()
  else:
    print(f'# irispy = irisconns.get_irispy("{name}")')
    irispy = irisconns.get_irispy(name)

  print(f'>>> Got connection!')
  time.sleep(.5)

  print(">>> Setting global ^test(1)")
  irispy.set(f'hello world from a "{name}" connection', 'test', 1)
  time.sleep(.5)

  print(">>> Getting global...")
  value = irispy.get('test', 1)
  print(f'>>> Value from IRIS: {value}')
  time.sleep(.5)

  print(">>> Killing global")
  irispy.kill('test', 1)
  pause()

  print('')
  

run_scenario('default', default_text)
run_scenario('USER_NS', user_text)
run_scenario('IRISAPP_NS', irisapp_text)
run_scenario('GENERIC', generic_text)

print("Let's try to reconnect using the IRISAPP_NS connection again.")
print("Notice that it will not prompt you for information this time.")
pause()
run_scenario('IRISAPP_NS', irisapp_text)
