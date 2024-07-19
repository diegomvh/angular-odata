import { CsdlReference } from './csdl/csdl-reference';
import { CsdlSchema } from './csdl/csdl-schema';

import { ApiConfig, ODataVersion } from '../types';

enum FieldType {
  ATTRIBUTE,
  TAG,
}

export class ODataMetadata {
  constructor(
    public Version: string,
    public References: CsdlReference[],
    public Schemas: CsdlSchema[],
  ) {}

constructor(
  public version: string,
  public references: CsdlReference[],
  public schemas: CsdlSchema[]
) {}

  static fromJson(json: any): ODataMetadata {
    return new ODataMetadata(
      json.Version,
      json.References.map((r: any) => new CsdlReference(r)),
      json.Schemas.map((s: any) => new CsdlSchema(s)),
    );
  }
}
