import { getLocalIpAddress } from "./network";

/**
 * The default port used by the ViaX:Trace API server in Termux.
 */
export const TERMUX_DEFAULT_PORT = 8080;

/**
 * Build the expected local server URL based on the device's current IP address.
 * Since the server runs inside Termux on the same Android device, the loopback
 * address 127.0.0.1 is always reliable regardless of the WiFi network.
 */
export function getTermuxLoopbackUrl(port: number = TERMUX_DEFAULT_PORT): string {
  return `http://127.0.0.1:${port}`;
}

/**
 * Build a suggested server URL using the device's LAN IP (useful when connecting
 * from another device on the same network).
 * Returns null if the local IP cannot be determined.
 */
export async function getTermuxLanUrl(
  port: number = TERMUX_DEFAULT_PORT,
): Promise<string | null> {
  const ip = await getLocalIpAddress();
  if (!ip) return null;
  return `http://${ip}:${port}`;
}

/**
 * Return the suggested URLs for the Termux server running on this device.
 * The loopback URL (127.0.0.1) is always the primary option.
 */
export async function getTermuxSuggestedUrls(
  port: number = TERMUX_DEFAULT_PORT,
): Promise<{ loopback: string; lan: string | null }> {
  const lanUrl = await getTermuxLanUrl(port);
  return {
    loopback: getTermuxLoopbackUrl(port),
    lan: lanUrl,
  };
}
