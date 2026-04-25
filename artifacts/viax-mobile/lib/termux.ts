// termux.ts

/**
 * Detect Termux servers on the local network and retrieve available URLs.
 */

import { NetworkInterfaceInfo, networkInterfaces } from 'os';
import * as dgram from 'dgram';

// Function to detect Termux servers
function detectTermuxServers(callback: (servers: string[]) => void) {
    const servers: string[] = [];
    const message = Buffer.from('termux-seek');
    const socket = dgram.createSocket('udp4');

    socket.on('message', (msg, rinfo) => {
        if (msg.toString() === 'termux-announce') {
            servers.push(`http://${rinfo.address}:8080`); // Assuming default Termux server port
        }
    });

    // Broadcast the message to the local network
    socket.bind(() => {
        socket.setBroadcast(true);
        const addressInfo = networkInterfaces();
        Object.values(addressInfo).forEach((network) => {
            network.forEach((info: NetworkInterfaceInfo) => {
                if (info.family === 'IPv4' && !info.internal) {
                    socket.send(message, 0, message.length, 8080, info.address);
                }
            });
        });
        // Stop listening after 3 seconds
        setTimeout(() => {
            socket.close();
            callback(servers);
        }, 3000);
    });
}

// Export the function for use in other modules
export { detectTermuxServers };