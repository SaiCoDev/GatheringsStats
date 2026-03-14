import { gatheringsApi } from "@/lib/api";
import { ServiceResponse, Experience, GameServer, ServerAllocationStateResponse } from "@/lib/types";
import { Card, StatCard } from "@/components/Card";
import { StatusBadge, ApprovalBadge } from "@/components/StatusBadge";
import { ErrorBox } from "@/components/ErrorBox";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ experienceId: string }>;
}

export default async function ExperienceDetailPage({ params }: Props) {
  const { experienceId } = await params;
  let experience: Experience | null = null;
  let error: string | null = null;

  try {
    const res = await gatheringsApi<ServiceResponse<Experience>>(
      `/experiences/${experienceId}`
    );
    experience = res.result;
  } catch (e) {
    error = String(e);
  }

  if (error || !experience) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Experience Details</h1>
        <ErrorBox message={error ?? "Experience not found"} />
      </div>
    );
  }

  // Try to fetch server allocation state for each scenario
  const allServers: { scenario: string; world: string; target: string; mode: string; allocation: ServerAllocationStateResponse | null }[] = [];

  for (const world of experience.worlds ?? []) {
    for (const target of world.targets ?? []) {
      for (const scenario of target.scenarios ?? []) {
        for (const mode of ["Dev", "QA", "Private", "Public"]) {
          try {
            const res = await gatheringsApi<ServiceResponse<ServerAllocationStateResponse>>(
              `/allocation/serverAllocationState/experiences/${experienceId}/worlds/${world.worldId}/targets/${target.targetId}/scenarios/${scenario.scenarioId}`,
              {
                method: "POST",
                body: { scenarioMode: mode, regions: [] },
              }
            );
            if (res.result && (res.result.servers > 0 || res.result.playerCount > 0)) {
              allServers.push({
                scenario: scenario.scenarioProperties?.scenarioName ?? scenario.scenarioId,
                world: world.name,
                target: target.targetId.slice(0, 8),
                mode,
                allocation: res.result,
              });
            }
          } catch {
            // Skip modes that fail
          }
        }
      }
    }
  }

  const totalScenarios = (experience.worlds ?? []).reduce(
    (sum, w) =>
      sum +
      (w.targets ?? []).reduce(
        (ts, t) => ts + (t.scenarios?.length ?? 0),
        0
      ),
    0
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{experience.name}</h1>
        <p className="mt-1 font-mono text-sm text-zinc-500">
          {experience.experienceId}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge active={experience.isEnabled} />
          {experience.isPublic && (
            <StatusBadge active={true} label="Public" />
          )}
          <ApprovalBadge
            state={experience.approvalStatus?.approvalState}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Worlds"
          value={experience.worlds?.length ?? 0}
        />
        <StatCard label="Total Scenarios" value={totalScenarios} />
        <StatCard
          label="Active Servers"
          value={allServers.reduce((s, a) => s + (a.allocation?.servers ?? 0), 0)}
        />
        <StatCard
          label="Total Players"
          value={allServers.reduce((s, a) => s + (a.allocation?.playerCount ?? 0), 0)}
        />
      </div>

      {/* Server Allocation */}
      {allServers.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">Server Allocation</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="pb-3 pr-4 font-medium">Scenario</th>
                  <th className="pb-3 pr-4 font-medium">World</th>
                  <th className="pb-3 pr-4 font-medium">Mode</th>
                  <th className="pb-3 pr-4 font-medium">Servers</th>
                  <th className="pb-3 pr-4 font-medium">Players</th>
                  <th className="pb-3 pr-4 font-medium">Capacity</th>
                  <th className="pb-3 font-medium">Usage</th>
                </tr>
              </thead>
              <tbody>
                {allServers.map((s, i) => (
                  <tr key={i} className="border-b border-zinc-800/50">
                    <td className="py-3 pr-4">{s.scenario}</td>
                    <td className="py-3 pr-4">{s.world}</td>
                    <td className="py-3 pr-4">
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs">
                        {s.mode}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{s.allocation?.servers ?? 0}</td>
                    <td className="py-3 pr-4">{s.allocation?.playerCount ?? 0}</td>
                    <td className="py-3 pr-4">{s.allocation?.maxCapacity ?? 0}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 rounded-full bg-zinc-800">
                          <div
                            className="h-2 rounded-full bg-emerald-500"
                            style={{
                              width: `${Math.min(
                                (s.allocation?.capacity ?? 0) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-zinc-400">
                          {((s.allocation?.capacity ?? 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Regional Breakdown */}
      {allServers.some((s) => s.allocation?.regionalCapacity) && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">Regional Breakdown</h2>
          {allServers
            .filter((s) => s.allocation?.regionalCapacity)
            .map((s, i) => (
              <Card key={i} className="mb-4">
                <h3 className="mb-3 font-medium">
                  {s.scenario} — {s.mode}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(s.allocation!.regionalCapacity!).map(
                    ([region, data]) => (
                      <div
                        key={region}
                        className="rounded-lg bg-zinc-800/50 p-3"
                      >
                        <p className="text-xs font-medium text-zinc-400">
                          {region}
                        </p>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-lg font-semibold">
                            {data.playerCount}
                          </span>
                          <span className="text-xs text-zinc-500">
                            / {data.maxCapacity} players
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500">
                          {data.servers} servers
                        </p>
                      </div>
                    )
                  )}
                </div>
              </Card>
            ))}
        </div>
      )}

      {/* Worlds */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Worlds</h2>
        <div className="grid gap-4">
          {(experience.worlds ?? []).map((world) => (
            <Card key={world.worldId}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{world.name}</h3>
                  <p className="font-mono text-xs text-zinc-500">
                    {world.worldId}
                  </p>
                </div>
                <div className="flex gap-2">
                  <StatusBadge active={world.isEnabled} />
                  <ApprovalBadge
                    state={world.approvalStatus?.approvalState}
                  />
                </div>
              </div>

              {/* Targets */}
              {(world.targets ?? []).length > 0 && (
                <div className="mt-4 space-y-3 border-t border-zinc-800 pt-3">
                  <p className="text-xs font-medium text-zinc-400">
                    Targets ({world.targets.length})
                  </p>
                  {world.targets.map((target) => (
                    <div
                      key={target.targetId}
                      className="rounded-lg bg-zinc-800/30 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-xs">
                          {target.targetId}
                        </p>
                        <StatusBadge active={target.isEnabled} />
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        Server Build: {target.serverBuildReference || "—"}
                      </p>

                      {/* Scenarios */}
                      {(target.scenarios ?? []).length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium text-zinc-400">
                            Scenarios ({target.scenarios.length})
                          </p>
                          {target.scenarios.map((scenario) => (
                            <div
                              key={scenario.scenarioId}
                              className="rounded-md bg-zinc-900/80 p-3"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium">
                                    {scenario.scenarioProperties
                                      ?.scenarioName ??
                                      "Unnamed Scenario"}
                                  </p>
                                  <p className="font-mono text-xs text-zinc-500">
                                    {scenario.scenarioId}
                                  </p>
                                </div>
                                <ApprovalBadge
                                  state={
                                    scenario.approvalStatus?.approvalState
                                  }
                                />
                              </div>

                              <div className="mt-2 grid gap-2 text-xs text-zinc-400 sm:grid-cols-3">
                                {scenario.scenarioProperties?.maxPlayers && (
                                  <span>
                                    Max Players:{" "}
                                    {scenario.scenarioProperties.maxPlayers}
                                  </span>
                                )}
                                {scenario.scenarioProperties
                                  ?.assignmentMode && (
                                  <span>
                                    Assignment:{" "}
                                    {
                                      scenario.scenarioProperties
                                        .assignmentMode
                                    }
                                  </span>
                                )}
                                {scenario.scenarioProperties
                                  ?.networkProtocol && (
                                  <span>
                                    Protocol:{" "}
                                    {
                                      scenario.scenarioProperties
                                        .networkProtocol
                                    }
                                  </span>
                                )}
                              </div>

                              {/* Active modes */}
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {target.activePublicScenarioId ===
                                  scenario.scenarioId && (
                                  <span className="rounded bg-emerald-900/30 px-2 py-0.5 text-xs text-emerald-400">
                                    Public
                                  </span>
                                )}
                                {target.activePrivateScenarioId ===
                                  scenario.scenarioId && (
                                  <span className="rounded bg-blue-900/30 px-2 py-0.5 text-xs text-blue-400">
                                    Private
                                  </span>
                                )}
                                {target.activeDevScenarioId ===
                                  scenario.scenarioId && (
                                  <span className="rounded bg-amber-900/30 px-2 py-0.5 text-xs text-amber-400">
                                    Dev
                                  </span>
                                )}
                                {target.activeQaScenarioId ===
                                  scenario.scenarioId && (
                                  <span className="rounded bg-purple-900/30 px-2 py-0.5 text-xs text-purple-400">
                                    QA
                                  </span>
                                )}
                              </div>

                              {/* Server properties */}
                              {scenario.scenarioProperties
                                ?.serverProperties &&
                                Object.keys(
                                  scenario.scenarioProperties.serverProperties
                                ).length > 0 && (
                                  <details className="mt-3">
                                    <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-300">
                                      Server Properties (
                                      {
                                        Object.keys(
                                          scenario.scenarioProperties
                                            .serverProperties
                                        ).length
                                      }
                                      )
                                    </summary>
                                    <div className="mt-2 max-h-48 overflow-auto rounded bg-zinc-950 p-2 font-mono text-xs">
                                      {Object.entries(
                                        scenario.scenarioProperties
                                          .serverProperties
                                      ).map(([k, v]) => (
                                        <div key={k}>
                                          <span className="text-zinc-500">
                                            {k}
                                          </span>
                                          ={v}
                                        </div>
                                      ))}
                                    </div>
                                  </details>
                                )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
