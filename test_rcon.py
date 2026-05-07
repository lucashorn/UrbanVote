import socket

def send_rcon(command):
    password = "coco"
    ip = "127.0.0.1"
    port = 27960
    prefix = b'\xff\xff\xff\xff'
    payload = f"rcon {password} {command}".encode('utf-8')
    packet = prefix + payload
    
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        sock.settimeout(2.0)
        sock.sendto(packet, (ip, port))
        try:
            data, addr = sock.recvfrom(4096)
            print("Received:", data)
        except Exception as e:
            print("Error receiving:", e)

send_rcon("status")
