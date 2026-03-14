import { gatheringsApi } from "@/lib/api";
import { ServiceResponse, Experience } from "@/lib/types";
import { Card } from "@/components/Card";
import { StatusBadge, ApprovalBadge } from "@/components/StatusBadge";
import { ErrorBox } from "@/components/ErrorBox";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ExperiencesPage() {
  let experiences: Experience[] = [];
  let error: string | null = null;

  try {
    const res = await gatheringsApi<ServiceResponse<Experience[]>>(
      "/experiences"
    );
    experiences = res.result;
  } catch (e) {
    error = String(e);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Experiences</h1>

      {error && <ErrorBox message={error} />}

      {experiences.length === 0 && !error && (
        <Card>
          <p className="text-zinc-400">No experiences found.</p>
        </Card>
      )}

      <div className="grid gap-4">
        {experiences.map((exp) => (
          <Link
            key={exp.experienceId}
            href={`/experiences/${exp.experienceId}`}
          >
            <Card className="transition-colors hover:border-zinc-700">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{exp.name}</h2>
                  <p className="font-mono text-xs text-zinc-500">
                    {exp.experienceId}
                  </p>
                  {exp.creatorId && (
                    <p className="mt-1 text-xs text-zinc-500">
                      Creator: {exp.creatorId}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge active={exp.isEnabled} />
                  {exp.isPublic && (
                    <StatusBadge active={true} label="Public" />
                  )}
                  <ApprovalBadge
                    state={exp.approvalStatus?.approvalState}
                  />
                </div>
              </div>

              {/* World summary */}
              {exp.worlds && exp.worlds.length > 0 && (
                <div className="mt-4 border-t border-zinc-800 pt-3">
                  <p className="mb-2 text-xs font-medium text-zinc-400">
                    {exp.worlds.length} World{exp.worlds.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {exp.worlds.map((w) => (
                      <span
                        key={w.worldId}
                        className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs"
                      >
                        {w.name}{" "}
                        <span className="text-zinc-500">
                          ({w.targets?.length ?? 0} targets)
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(exp.startTimeUtc || exp.endTimeUtc) && (
                <div className="mt-3 flex gap-4 text-xs text-zinc-500">
                  {exp.startTimeUtc && (
                    <span>
                      Start:{" "}
                      {new Date(exp.startTimeUtc).toLocaleDateString()}
                    </span>
                  )}
                  {exp.endTimeUtc && (
                    <span>
                      End:{" "}
                      {new Date(exp.endTimeUtc).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
