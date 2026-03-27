import pty
import os
import time

def run_ssh_cmd(host, user, password, cmd):
    pid, fd = pty.fork()
    if pid == 0:
        # child
        os.execvp('ssh', ['ssh', '-o', 'StrictHostKeyChecking=no', f'{user}@{host}', cmd])
    else:
        # parent
        output = b''
        password_sent = False
        while True:
            try:
                data = os.read(fd, 1024)
                if not data:
                    break
                output += data
                # Check for password prompt
                if b'password:' in output.lower() and not password_sent:
                    os.write(fd, password.encode() + b'\n')
                    password_sent = True
            except OSError:
                break
        
        _, status = os.waitpid(pid, 0)
        return output.decode('utf-8', errors='replace'), status

out, status = run_ssh_cmd('43.136.118.137', 'root', '5612253Ab', 'uname -a; node -v; npm -v; pm2 -v')
print("Status:", status)
print("Output:\n", out)
