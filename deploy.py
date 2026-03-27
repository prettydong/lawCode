import paramiko
import os
import time

def deploy():
    host = '43.136.118.137'
    user = 'root'
    password = '5612253Abc'
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    print("Connecting to SSH...")
    ssh.connect(host, username=user, password=password, port=22, timeout=10)
    
    print("Uploading deploy.tar.gz...")
    sftp = ssh.open_sftp()
    sftp.put('/home/zdong/lawCode/deploy.tar.gz', '/root/deploy.tar.gz')
    sftp.close()
    
    commands = [
        "mkdir -p /root/lawCode_web",
        "tar -xf /root/deploy.tar.gz -C /root/lawCode_web",
        "cd /root/lawCode_web && npm install",
        "cd /root/lawCode_web && npm run build",
        "fuser -k 12345/tcp || echo 'No service on 12345'",
        "pm2 delete lawCode-web || echo 'No pm2 service'",
        "cd /root/lawCode_web && PORT=12345 pm2 start npm --name 'lawCode-web' -- start"
    ]
    
    for cmd in commands:
        print(f"Running: {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        
        # Wait for command to finish
        exit_status = stdout.channel.recv_exit_status()
        
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        if out:
            print(out)
        if err:
            print("ERR:", err)
            
    print("Deployment complete.")
    ssh.close()

if __name__ == '__main__':
    deploy()
