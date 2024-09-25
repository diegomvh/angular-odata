import { CsdlAction, CsdlFunction } from './csdl/csdl-function-action';
import { CsdlReference } from './csdl/csdl-reference';
import { CsdlSchema } from './csdl/csdl-schema';

export class ODataMetadata {
  Version: string;
  References: CsdlReference[];
  Schemas: CsdlSchema[];
  constructor(Version: string, References: any[], Schemas: any[]) {
    this.Version = Version;
    this.References = References?.map((r) => new CsdlReference(r));
    this.Schemas = Schemas?.map((s) => new CsdlSchema(s));
  }

  toJson() {
    return {
      Version: this.Version,
      References: this.References.map((r) => r.toJson()),
      Schemas: this.Schemas.map((s) => s.toJson()),
    };
  }

  functions() {
    return this.Schemas.reduce((acc, s) => {
      return [...acc, ...(s.Function ?? [])];
    }, [] as CsdlFunction[]);
  }

  actions() {
    return this.Schemas.reduce((acc, s) => {
      return [...acc, ...(s.Action ?? [])];
    }, [] as CsdlAction[]);
  }

  static fromJson(json: any): ODataMetadata {
    return new ODataMetadata(json.Version, json.References, json.Schemas);
  }
}
