export interface Schema {
  name: string;
  project: string;
  metadata: string;
  path: string;
  models: boolean;
  barrel: boolean;
  staticMetadata: boolean;
  serviceRootUrl?: string;
  version?: string;
  creation?: Date;
}
