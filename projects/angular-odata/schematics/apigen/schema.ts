export interface Schema {
  name: string;
  project: string;
  metadata: string;
  path: string;
  serviceRootUrl?: string;
  version?: string;
  creation?: Date;
}
