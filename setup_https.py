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

# Step 1: Detect OS
run(ssh, "cat /etc/os-release | head -5")

# Step 2: Install Nginx
run(ssh, "which nginx || yum install -y nginx || dnf install -y nginx")

# Step 3: Create Nginx config directory structure if needed
run(ssh, "mkdir -p /etc/nginx/conf.d")

# Step 4: Write config to conf.d (works on both debian/centos)
nginx_conf = r'''server {
    listen 12345 ssl;
    server_name 43.136.118.137;

    ssl_certificate /etc/ssl/lawcode/server.crt;
    ssl_certificate_key /etc/ssl/lawcode/server.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass $http_upgrade;
    }
}
'''

run(ssh, f"cat > /etc/nginx/conf.d/lawcode-https.conf << 'ENDCONF'\n{nginx_conf}ENDCONF")

# Step 5: Test & start Nginx
run(ssh, "nginx -t")
run(ssh, "systemctl enable nginx")
run(ssh, "systemctl restart nginx")

# Step 6: Start Next.js on port 3000
run(ssh, "cd /root/lawCode_web && PORT=3000 npx pm2 start npm --name 'lawCode-web' -- start")
run(ssh, "cd /root/lawCode_web && npx pm2 save")

print("\n✅ Done! Test: curl -k https://43.136.118.137:12345/")
ssh.close()
