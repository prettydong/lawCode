import paramiko

def run_fix():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('43.136.118.137', username='root', password='5612253Abc', port=22)
    
    commands = [
        "cd /root/lawCode_web && PORT=12345 npx pm2 start npm --name 'lawCode-web' -- start",
        "cd /root/lawCode_web && npx pm2 save"
    ]
    for cmd in commands:
        print(f"Running: {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        print(stdout.read().decode('utf-8'))
        print(stderr.read().decode('utf-8'))
        
    ssh.close()

if __name__ == '__main__':
    run_fix()
