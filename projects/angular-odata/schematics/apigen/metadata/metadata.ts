import { CsdlAction, CsdlFunction } from "./csdl/csdl-function-action";
import { CsdlReference } from "./csdl/csdl-reference";
import { CsdlSchema } from "./csdl/csdl-schema";

export class ODataMetadata {
  Version: string;
  References: CsdlReference[];
  Schemas: CsdlSchema[];
  constructor(Version: string, References: any[], Schemas: any[]) {
    this.Version = Version;
    this.References = References?.map(r => { return new CsdlReference(r); });
    this.Schemas = Schemas?.map(s => { return new CsdlSchema(s); });
  }

  functions() {
    return this.Schemas.reduce((acc, s) => {
      return [...acc, ...s.Function ?? []];
    }, [] as CsdlFunction[]);
  }

  actions() {
    return this.Schemas.reduce((acc, s) => {
      return [...acc, ...s.Action ?? []];
    }, [] as CsdlAction[]);
  }
}
