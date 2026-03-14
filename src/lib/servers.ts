export interface ServerConfig {
  name: string;
  host: string;
  port: number;
  icon?: string;
  isMine?: boolean;
}

// Featured Bedrock servers from the Minecraft Servers tab
// Update these with your actual server addresses
export const SERVERS: ServerConfig[] = [
  // Your server — update host if different
  { name: "Enchanted Dragons", host: "play.enchanted.gg", port: 19132, isMine: true },

  // Other featured servers (for comparison/benchmarking)
  { name: "Galaxite", host: "play.galaxite.net", port: 19132 },
  { name: "The Hive", host: "geo.hivebedrock.network", port: 19132 },
  { name: "CubeCraft", host: "mco.cubecraft.net", port: 19132 },
  { name: "Lifeboat", host: "play.lbsg.net", port: 19132 },
  { name: "Mineville", host: "play.inpvp.net", port: 19132 },
];
