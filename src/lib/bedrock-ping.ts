import dgram from "dgram";

const RAKNET_MAGIC = Buffer.from([
  0x00, 0xff, 0xff, 0x00, 0xfe, 0xfe, 0xfe, 0xfe, 0xfd, 0xfd, 0xfd, 0xfd,
  0x12, 0x34, 0x56, 0x78,
]);

export interface BedrockServerInfo {
  host: string;
  port: number;
  online: boolean;
  edition?: string;
  motd?: string;
  protocolVersion?: number;
  gameVersion?: string;
  playerCount?: number;
  maxPlayers?: number;
  serverId?: string;
  mapName?: string;
  gameMode?: string;
  nintendoLimited?: boolean;
  ipv4Port?: number;
  ipv6Port?: number;
  latency?: number;
  error?: string;
}

export async function pingBedrockServer(
  host: string,
  port: number = 19132,
  timeout: number = 5000
): Promise<BedrockServerInfo> {
  return new Promise((resolve) => {
    const client = dgram.createSocket("udp4");
    const startTime = Date.now();

    const timer = setTimeout(() => {
      client.close();
      resolve({ host, port, online: false, error: "Timeout" });
    }, timeout);

    // Build Unconnected Ping packet
    const packet = Buffer.alloc(1 + 8 + 16 + 8);
    packet[0] = 0x01; // ID_UNCONNECTED_PING
    packet.writeBigInt64BE(BigInt(Date.now()), 1); // timestamp
    RAKNET_MAGIC.copy(packet, 9); // magic
    packet.writeBigInt64BE(BigInt(2), 25); // client GUID

    client.on("message", (msg) => {
      clearTimeout(timer);
      const latency = Date.now() - startTime;

      try {
        // Skip: packetId(1) + timestamp(8) + serverGuid(8) + magic(16) + stringLength(2)
        const strLen = msg.readUInt16BE(35);
        const serverInfoStr = msg.subarray(37, 37 + strLen).toString("utf-8");
        const parts = serverInfoStr.split(";");

        const info: BedrockServerInfo = {
          host,
          port,
          online: true,
          latency,
          edition: parts[0],
          motd: parts[1],
          protocolVersion: parts[2] ? parseInt(parts[2]) : undefined,
          gameVersion: parts[3],
          playerCount: parts[4] ? parseInt(parts[4]) : undefined,
          maxPlayers: parts[5] ? parseInt(parts[5]) : undefined,
          serverId: parts[6],
          mapName: parts[7],
          gameMode: parts[8],
          nintendoLimited: parts[9] === "0",
          ipv4Port: parts[10] ? parseInt(parts[10]) : undefined,
          ipv6Port: parts[11] ? parseInt(parts[11]) : undefined,
        };

        client.close();
        resolve(info);
      } catch (e) {
        client.close();
        resolve({ host, port, online: true, latency, error: String(e) });
      }
    });

    client.on("error", (err) => {
      clearTimeout(timer);
      client.close();
      resolve({ host, port, online: false, error: err.message });
    });

    client.send(packet, port, host);
  });
}

export async function pingMultipleServers(
  servers: { host: string; port?: number }[]
): Promise<BedrockServerInfo[]> {
  return Promise.all(
    servers.map((s) => pingBedrockServer(s.host, s.port ?? 19132))
  );
}
