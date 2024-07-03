import {
  CsdlReference,
} from './csdl/csdl-reference';

import { CsdlSchema } from './csdl/csdl-schema';
import { ApiConfig, ODataVersion } from '../types';
export class ODataMetadata {
  constructor(
    public version: string,
    public references: CsdlReference[],
    public schemas: CsdlSchema[]
  ) {}

  toConfig(base?: ApiConfig): ApiConfig {
    return Object.assign({
      version: this.version as ODataVersion,
      schemas: this.schemas.map(s => s.toConfig())
    }, base ?? {}) as ApiConfig;
  }
}
