import { CsdlEntitySet } from './csdl-entity-set';
import { CsdlSingleton } from './csdl-singleton';
import { CsdlFunctionImport, CsdlActionImport } from './csdl-function-action';
import { CsdlAnnotable } from './csdl-annotation';
import type { CsdlSchema } from './csdl-schema';
import { ODataEntityContainerConfig } from '../../types';

export class CsdlEntityContainer extends CsdlAnnotable {
  public Name: string;
  public Extend?: string;
  public EntitySet?: CsdlEntitySet[];
  public Singleton?: CsdlSingleton[];
  public FunctionImport?: CsdlFunctionImport[];
  public ActionImport?: CsdlActionImport[];

  constructor(
    private schema: CsdlSchema,
    {
      Name,
      Extend,
      EntitySet,
      Singleton,
      FunctionImport,
      ActionImport,
      Annotation,
    }: {
      Name: string;
      Extend?: string;
      EntitySet?: any[];
      Singleton?: any[];
      FunctionImport?: any[];
      ActionImport?: any[];
      Annotation?: any[];
    },
  ) {
    super({ Annotation });

    this.Name = Name;
    this.Extend = Extend;
    this.EntitySet = EntitySet?.map((e) => new CsdlEntitySet(this, e));
    this.Singleton = Singleton?.map((s) => new CsdlSingleton(this, s));
    this.FunctionImport = FunctionImport?.map((f) => new CsdlFunctionImport(this, f));
    this.ActionImport = ActionImport?.map((a) => new CsdlActionImport(this, a));
  }

  override toJson() {
    const json: { [key: string]: any } = { ...super.toJson() };
    if (this.Extend !== undefined) {
      json['Extend'] = this.Extend;
    }
    if (Array.isArray(this.EntitySet) && this.EntitySet.length > 0) {
      json['EntitySet'] = this.EntitySet.map((a) => a.toJson());
    }
    if (Array.isArray(this.Singleton) && this.Singleton.length > 0) {
      json['Singleton'] = this.Singleton.map((a) => a.toJson());
    }
    if (Array.isArray(this.FunctionImport) && this.FunctionImport.length > 0) {
      json['FunctionImport'] = this.FunctionImport.map((a) => a.toJson());
    }
    if (Array.isArray(this.ActionImport) && this.ActionImport.length > 0) {
      json['ActionImport'] = this.ActionImport.map((a) => a.toJson());
    }
    return json;
  }

  name() {
    return `${this.Name}`;
  }

  namespace() {
    return `${this.schema.Namespace}`;
  }

  fullName() {
    return `${this.schema.Namespace}.${this.Name}`;
  }

  override toConfig(base?: Partial<ODataEntityContainerConfig>): ODataEntityContainerConfig {
    return {
      ...super.toConfig(),
      name: this.Name,
      entitySets: this.EntitySet?.map((t) => t.toConfig()),
    };
  }
}
