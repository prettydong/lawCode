import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('43.136.118.137', username='root', password='5612253Abc', port=22, timeout=10)

# Upload the shell script
sftp = ssh.open_sftp()
sftp.put('/home/zdong/lawCode/fix_service.sh', '/root/fix_service.sh')
sftp.close()
print("Script uploaded.")

# Run it via nohup so it doesn't depend on SSH session
stdin, stdout, stderr = ssh.exec_command("chmod +x /root/fix_service.sh && bash /root/fix_service.sh > /root/fix_output.log 2>&1 &")
time.sleep(1)
print("Script launched in background.")

# Wait for it to finish
time.sleep(12)

# Read the output
stdin, stdout, stderr = ssh.exec_command("cat /root/fix_output.log")
stdout.channel.recv_exit_status()
print(stdout.read().decode())

ssh.close()
