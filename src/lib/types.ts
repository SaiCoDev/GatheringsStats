export interface ServiceResponse<T> {
  result: T;
  continuationToken?: string;
}

export interface Experience {
  experienceId: string;
  creatorId: string;
  name: string;
  isEnabled: boolean;
  isPublic: boolean;
  worlds: World[];
  entryPointWorldId?: string;
  startTimeUtc?: string;
  endTimeUtc?: string;
  isDisabledAdmin: boolean;
  approvalStatus?: ApprovalStatus;
  allowSelfApproval: boolean;
}

export interface World {
  worldId: string;
  name: string;
  isEnabled: boolean;
  targets: Target[];
  approvalStatus?: ApprovalStatus;
  isPublic: boolean;
  worldAccessLevel?: string;
}

export interface Target {
  targetId: string;
  isEnabled: boolean;
  scenarios: Scenario[];
  requiredExperiments?: string[];
  activePublicScenarioId?: string;
  activePrivateScenarioId?: string;
  activeDevScenarioId?: string;
  activeQaScenarioId?: string;
  serverBuildReference: string;
  lastModifiedDate?: string;
}

export interface Scenario {
  scenarioId: string;
  scenarioProperties: ScenarioProperties;
  approvalStatus?: ApprovalStatus;
  submittedForApprovalAt?: string;
  created?: AuditMetadata;
  lastActivatedAt?: Record<string, AuditMetadata>;
  lastDeactivatedAt?: Record<string, AuditMetadata>;
  lastDeployedAt?: Record<string, AuditMetadata>;
}

export interface ScenarioProperties {
  serverProperties?: Record<string, string>;
  worldReference?: string;
  maxPlayers?: number;
  assignmentMode?: string;
  scenarioName?: string;
  scenarioDescription?: string;
  networkProtocol?: string;
  regionOverrides?: Record<string, string>;
  shutdownConfigurationMinimumPlayerThreshold?: number;
  shutdownConfigurationShutdownAfter?: string;
}

export interface ApprovalStatus {
  approvalState: string;
  reason?: string;
  auditMetadata?: AuditMetadata;
}

export interface AuditMetadata {
  date?: string;
  userName?: string;
  userId?: string;
}

export interface GameServer {
  buildId: string;
  serverId: string;
  status: string;
  ipV4Address: string;
  fqdn?: string;
  controlPort: number;
  gameplayPort: number;
  networkProtocol?: string;
  netherNetId?: string;
  serverPlatform?: string;
  region: string;
  backendId?: string;
  scenarioId?: string;
  referenceId?: string;
}

export interface GetServersResponse {
  pageSize: number;
  continuationToken?: string;
  servers: GameServer[];
}

export interface ContentBlobInfo<T> {
  reference: string;
  metadata: T;
}

export interface ContentMetadata {
  tags?: string[];
  name: string;
  description?: string;
  uploaderId?: string;
  uploaderName?: string;
  uploadedAt?: string;
  isArchived: boolean;
  type?: string;
}

export interface ServerBuildMetadata extends ContentMetadata {
  platform?: string;
  serverVersion?: string;
  executableName?: string;
  fileName?: string;
  supportedClientVersions?: string[];
}

export interface ServerAllocationStateResponse {
  servers: number;
  maxCapacity: number;
  playerCount: number;
  capacity: number;
  regionalCapacity?: Record<string, {
    servers: number;
    maxCapacity: number;
    playerCount: number;
    capacity: number;
  }>;
}

export interface PlayerIdsResponse {
  playFabId: string;
  xuid: string;
  gamertag: string;
  sandbox?: string;
}

export interface RestrictedCreator {
  id: string;
  desc: string;
  isBanned: boolean;
  isGatheringsEnabled: boolean;
  gatherings?: string[];
}

export interface RolesForIdentity {
  identityId: string;
  preferredName: string;
  displayName: string;
  tenantId: string;
  provider: string;
  rolesAssigned: string[];
  allTenantRoles: string[];
}
