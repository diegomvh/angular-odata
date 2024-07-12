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
}
