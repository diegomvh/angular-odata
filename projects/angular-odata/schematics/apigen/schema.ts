export interface Schema {
  name: string;
  project: string;
  metadata: string;
  path: string;
  models: boolean;
  serviceRootUrl?: string;
  version?: string;
  creation?: Date;
}
