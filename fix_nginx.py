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

# Delete old pm2 process and recreate with correct PORT
run(ssh, "npx pm2 delete lawCode-web || true")
run(ssh, "fuser -k 3000/tcp || true")
run(ssh, "fuser -k 12345/tcp || true")

# Restart nginx to reclaim port 12345
run(ssh, "systemctl restart nginx")

# Start Next.js fresh with PORT=3000
run(ssh, "cd /root/lawCode_web && PORT=3000 npx pm2 start npm --name 'lawCode-web' -- start")
run(ssh, "npx pm2 save")

# Wait and verify
import time
time.sleep(3)
run(ssh, "curl -k -s -I https://127.0.0.1:12345/")

ssh.close()
