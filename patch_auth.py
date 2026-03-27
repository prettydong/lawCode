import paramiko

def patch_deploy():
    host = '43.136.118.137'
    user = 'root'
    password = '5612253Abc'
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print("Connecting to SSH...")
    ssh.connect(host, username=user, password=password, port=22, timeout=10)
    
    print("Uploading lib/auth.ts...")
    sftp = ssh.open_sftp()
    sftp.put('/home/zdong/lawCode/web/lib/auth.ts', '/root/lawCode_web/lib/auth.ts')
    sftp.close()
    
    commands = [
        "cd /root/lawCode_web && npm run build",
        "cd /root/lawCode_web && npx pm2 reload lawCode-web"
    ]
    
    for cmd in commands:
        print(f"Running: {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        exit_status = stdout.channel.recv_exit_status()
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        if out: print(out)
        if err: print("ERR:", err)
            
    print("Patch complete.")
    ssh.close()

if __name__ == '__main__':
    patch_deploy()
