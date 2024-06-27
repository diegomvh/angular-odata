export interface Schema {
  name: string;
  metadata: string;
  output: string;
  purge?: boolean;
  models?: boolean;
  entity?: string;
}