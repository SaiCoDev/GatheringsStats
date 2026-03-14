import { gatheringsApi } from "@/lib/api";
import { ServiceResponse, PlayerIdsResponse } from "@/lib/types";
import { Card } from "@/components/Card";
import { ErrorBox } from "@/components/ErrorBox";

export const dynamic = "force-dynamic";

export default async function AllowlistPage() {
  let devPlayers: PlayerIdsResponse[] = [];
  let devError: string | null = null;

  try {
    const res = await gatheringsApi<ServiceResponse<PlayerIdsResponse[]>>(
      "/allowlist/dev"
    );
    devPlayers = res.result ?? [];
  } catch (e) {
    devError = String(e);
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Allowlists</h1>

      {/* Dev Allowlist */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold">
          Dev Allowlist ({devPlayers.length} players)
        </h2>
        {devError && <ErrorBox message={devError} />}

        {devPlayers.length === 0 && !devError && (
          <p className="text-sm text-zinc-500">
            No players in the dev allowlist.
          </p>
        )}

        {devPlayers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="pb-2 pr-4 font-medium">Gamertag</th>
                  <th className="pb-2 pr-4 font-medium">XUID</th>
                  <th className="pb-2 font-medium">PlayFab ID</th>
                </tr>
              </thead>
              <tbody>
                {devPlayers.map((p, i) => (
                  <tr key={i} className="border-b border-zinc-800/50">
                    <td className="py-2 pr-4 font-medium">
                      {p.gamertag || "—"}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-zinc-400">
                      {p.xuid || "—"}
                    </td>
                    <td className="py-2 font-mono text-xs text-zinc-400">
                      {p.playFabId || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
