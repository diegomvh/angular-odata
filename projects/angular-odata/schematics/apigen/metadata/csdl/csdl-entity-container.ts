import { CsdlEntitySet } from './csdl-entity-set';
import { CsdlSingleton } from './csdl-singleton';
import { CsdlFunctionImport, CsdlActionImport } from './csdl-function-action';
import { CsdlAnnotable } from './csdl-annotation';
import type { CsdlSchema } from './csdl-schema';

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
    this.FunctionImport = FunctionImport?.map(
      (f) => new CsdlFunctionImport(this, f),
    );
    this.ActionImport = ActionImport?.map((a) => new CsdlActionImport(this, a));
  }

  override toJson() {
    const json: {[key: string]: any} = {
      ...super.toJson(),
      Extend: this.Extend,
    };
    if (Array.isArray(this.EntitySet) && this.EntitySet.length) {
      json['EntitySet'] = this.EntitySet.map((a) => a.toJson());
    }
    if (Array.isArray(this.Singleton) && this.Singleton.length) {
      json['Singleton'] = this.Singleton.map((a) => a.toJson());
    }
    if (Array.isArray(this.FunctionImport) && this.FunctionImport.length) {
      json['FunctionImport'] = this.FunctionImport.map((a) => a.toJson());
    }
    if (Array.isArray(this.ActionImport) && this.ActionImport.length) {
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
}
