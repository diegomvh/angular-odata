import { CsdlEntitySet } from './csdl-entity-set';
import { CsdlSingleton } from './csdl-singleton';
import { CsdlFunctionImport, CsdlActionImport } from './csdl-function-action';
import { CsdlAnnotable, CsdlAnnotation } from './csdl-annotation';
import { EntityContainerConfig } from '../../types';

export class CsdlEntityContainer extends CsdlAnnotable {
  constructor(
    public name: string,
    public extend?: string,
    public entitySets?: CsdlEntitySet[],
    public singletons?: CsdlSingleton[],
    public functionImports?: CsdlFunctionImport[],
    public actionImports?: CsdlActionImport[],
    annotations?: CsdlAnnotation[],
  ) {
    super(annotations);
  }

  toConfig(): EntityContainerConfig {
    return {
      name: this.name,
      annotations: this.annotations?.map(t => t.toConfig()),
      entitySets: this.entitySets?.map(t => t.toConfig()),
    }
  }
}
