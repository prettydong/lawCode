import paramiko

def run(ssh, cmd):
    print(f">>> {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out: print(out)
    if err: print("ERR:", err)
    return out, err, exit_code

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('43.136.118.137', username='root', password='5612253Abc', port=22, timeout=10)

run(ssh, "npx pm2 list")
run(ssh, "npx pm2 logs lawCode-web --nostream --lines 30")
run(ssh, "fuser 3000/tcp || echo 'Port 3000 is free (nothing listening!)'")

ssh.close()
