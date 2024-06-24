import {
  CsdlReference,
} from './csdl/csdl-reference';

import { CsdlSchema } from './csdl/csdl-schema';
import { ApiConfig, ODataVersion } from '../types';

enum FieldType {
  ATTRIBUTE,
  TAG,
}

export class ODataMetadata {

constructor(
  public version: string,
  public references: CsdlReference[],
  public schemas: CsdlSchema[]
) {}

  toConfig(): ApiConfig {
    return {
      version: this.version as ODataVersion,
      schemas: this.schemas.map(s => s.toConfig())
    } as ApiConfig;
  }
}
