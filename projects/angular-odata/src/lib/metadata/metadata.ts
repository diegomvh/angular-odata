import { CsdlReference } from './csdl/csdl-reference';
import { CsdlSchema } from './csdl/csdl-schema';

import { ApiConfig, ODataVersion } from '../types';

export class ODataMetadata {
  constructor(
    public Version: string,
    public References: CsdlReference[],
    public Schemas: CsdlSchema[],
  ) {}

  toConfig(base?: ApiConfig): ApiConfig {
    return Object.assign(
      {
        version: this.Version as ODataVersion,
        schemas: this.Schemas.map((s) => s.toConfig()),
      },
      base ?? {},
    ) as ApiConfig;
  }

  static fromJson(json: any): ODataMetadata {
    return new ODataMetadata(
      json.Version,
      json.References.map((r: any) => new CsdlReference(r)),
      json.Schemas.map((s: any) => new CsdlSchema(s)),
    );
  }
}
