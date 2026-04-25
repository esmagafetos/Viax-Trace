// network.ts

/**
 * Helper functions for detecting local network IPs.
 */

/**
 * Get the local network IP addresses.
 * @returns {string[]} An array of local IP addresses.
 */
function getLocalNetworkIPs() {
    const os = require('os');
    const ifaces = os.networkInterfaces();
    const ips = [];

    for (const iface of Object.values(ifaces)) {
        for (const details of iface) {
            if (details.family === 'IPv4' && !details.internal) {
                ips.push(details.address);
            }
        }
    }

    return ips;
}

/**
 * Log local network IPs to the console.
 */
function logLocalIPs() {
    const ips = getLocalNetworkIPs();
    console.log('Local Network IPs:', ips);
}

// Exporting the functions for external use
module.exports = { getLocalNetworkIPs, logLocalIPs };