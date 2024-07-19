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
    super({ Annotation });

    this.Name = Name;
    this.Extend = Extend;
    this.EntitySet = EntitySet?.map((e) => new CsdlEntitySet(this, e));
    this.Singleton = Singleton?.map((s) => new CsdlSingleton(this, s));
    this.FunctionImport = FunctionImport?.map(
      (f) => new CsdlFunctionImport(this, f),
    );
    this.ActionImport = ActionImport?.map((a) => new CsdlActionImport(this, a));
  }

  get Namespace() {
    return this.schema.Namespace;
  }

  toConfig(): EntityContainerConfig {
    return {
      name: this.name,
      annotations: this.annotations?.map(t => t.toConfig()),
      entitySets: this.entitySets?.map(t => t.toConfig()),
    }
  }
}
