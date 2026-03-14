import { gatheringsApi } from "@/lib/api";
import { ServiceResponse, ContentBlobInfo, ServerBuildMetadata, ContentMetadata } from "@/lib/types";
import { Card } from "@/components/Card";
import { ErrorBox } from "@/components/ErrorBox";

export const dynamic = "force-dynamic";

async function fetchContent() {
  const errors: string[] = [];
  let serverBuilds: ContentBlobInfo<ServerBuildMetadata>[] = [];
  let behaviorPacks: ContentBlobInfo<ContentMetadata>[] = [];
  let resourcePacks: ContentBlobInfo<ContentMetadata>[] = [];
  let worlds: ContentBlobInfo<ContentMetadata>[] = [];

  const results = await Promise.allSettled([
    gatheringsApi<ServiceResponse<ContentBlobInfo<ServerBuildMetadata>[]>>(
      "/content/serverBuild"
    ),
    gatheringsApi<ServiceResponse<ContentBlobInfo<ContentMetadata>[]>>(
      "/content/behaviorPack"
    ),
    gatheringsApi<ServiceResponse<ContentBlobInfo<ContentMetadata>[]>>(
      "/content/resourcePack"
    ),
    gatheringsApi<ServiceResponse<ContentBlobInfo<ContentMetadata>[]>>(
      "/content/world"
    ),
  ]);

  if (results[0].status === "fulfilled") serverBuilds = results[0].value.result ?? [];
  else errors.push("Server Builds: " + (results[0] as PromiseRejectedResult).reason?.message);

  if (results[1].status === "fulfilled") behaviorPacks = results[1].value.result ?? [];
  else errors.push("Behavior Packs: " + (results[1] as PromiseRejectedResult).reason?.message);

  if (results[2].status === "fulfilled") resourcePacks = results[2].value.result ?? [];
  else errors.push("Resource Packs: " + (results[2] as PromiseRejectedResult).reason?.message);

  if (results[3].status === "fulfilled") worlds = results[3].value.result ?? [];
  else errors.push("Worlds: " + (results[3] as PromiseRejectedResult).reason?.message);

  return { serverBuilds, behaviorPacks, resourcePacks, worlds, errors };
}

function ContentTable({ items, type }: { items: ContentBlobInfo<ContentMetadata>[]; type: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">No {type} found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-400">
            <th className="pb-2 pr-4 font-medium">Name</th>
            <th className="pb-2 pr-4 font-medium">Description</th>
            <th className="pb-2 pr-4 font-medium">Uploaded By</th>
            <th className="pb-2 pr-4 font-medium">Date</th>
            <th className="pb-2 font-medium">Archived</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.reference} className="border-b border-zinc-800/50">
              <td className="py-2 pr-4 font-medium">{item.metadata.name}</td>
              <td className="py-2 pr-4 text-zinc-400">
                {item.metadata.description || "—"}
              </td>
              <td className="py-2 pr-4 text-zinc-400">
                {item.metadata.uploaderName || "—"}
              </td>
              <td className="py-2 pr-4 text-zinc-400">
                {item.metadata.uploadedAt
                  ? new Date(item.metadata.uploadedAt).toLocaleDateString()
                  : "—"}
              </td>
              <td className="py-2">
                {item.metadata.isArchived ? (
                  <span className="text-amber-400">Yes</span>
                ) : (
                  <span className="text-zinc-500">No</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ContentPage() {
  const { serverBuilds, behaviorPacks, resourcePacks, worlds, errors } =
    await fetchContent();

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Content</h1>

      {errors.map((e, i) => (
        <ErrorBox key={i} message={e} />
      ))}

      {/* Server Builds */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold">
          Server Builds ({serverBuilds.length})
        </h2>
        {serverBuilds.length === 0 ? (
          <p className="text-sm text-zinc-500">No server builds found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Version</th>
                  <th className="pb-2 pr-4 font-medium">Platform</th>
                  <th className="pb-2 pr-4 font-medium">Executable</th>
                  <th className="pb-2 pr-4 font-medium">Client Versions</th>
                  <th className="pb-2 font-medium">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {serverBuilds.map((sb) => (
                  <tr
                    key={sb.reference}
                    className="border-b border-zinc-800/50"
                  >
                    <td className="py-2 pr-4 font-medium">
                      {sb.metadata.name}
                    </td>
                    <td className="py-2 pr-4 text-zinc-400">
                      {sb.metadata.serverVersion || "—"}
                    </td>
                    <td className="py-2 pr-4 text-zinc-400">
                      {sb.metadata.platform || "—"}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-zinc-400">
                      {sb.metadata.executableName || "—"}
                    </td>
                    <td className="py-2 pr-4 text-zinc-400">
                      {sb.metadata.supportedClientVersions?.join(", ") || "—"}
                    </td>
                    <td className="py-2 text-zinc-400">
                      {sb.metadata.uploadedAt
                        ? new Date(
                            sb.metadata.uploadedAt
                          ).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Behavior Packs */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold">
          Behavior Packs ({behaviorPacks.length})
        </h2>
        <ContentTable items={behaviorPacks} type="behavior packs" />
      </Card>

      {/* Resource Packs */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold">
          Resource Packs ({resourcePacks.length})
        </h2>
        <ContentTable items={resourcePacks} type="resource packs" />
      </Card>

      {/* Worlds */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold">
          Worlds ({worlds.length})
        </h2>
        <ContentTable items={worlds} type="worlds" />
      </Card>
    </div>
  );
}
