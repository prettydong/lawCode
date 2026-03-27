import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('43.136.118.137', username='root', password='5612253Abc', port=22)

def run(cmd):
    print(f"--- {cmd} ---")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    o = stdout.read().decode()
    e = stderr.read().decode()
    if o: print("STDOUT:", o)
    if e: print("STDERR:", e)

run('node -v')
run('npm -v')
run('pm2 -v')
run('lsof -i :12345')

ssh.close()
