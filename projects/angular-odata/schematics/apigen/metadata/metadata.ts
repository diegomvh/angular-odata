import { CsdlReference } from "./csdl/csdl-reference";
import { CsdlSchema } from "./csdl/csdl-schema";

export class ODataMetadata {
  constructor(public version: string, public references: CsdlReference[], public schemas: CsdlSchema[]) {}
}
