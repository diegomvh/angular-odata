import { CsdlEntitySet } from './csdl-entity-set';
import { CsdlSingleton } from './csdl-singleton';
import { CsdlFunctionImport, CsdlActionImport } from './csdl-function-action';
import { CsdlAnnotable } from './csdl-annotation';
import type { CsdlSchema } from './csdl-schema';
import { EntityContainerConfig } from '../../types';

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
    return {
      ...super.toJson(),
      Extend: this.Extend,
      EntitySet: this.EntitySet?.map((e) => e.toJson()),
      Singleton: this.Singleton?.map((s) => s.toJson()),
      FunctionImport: this.FunctionImport?.map((f) => f.toJson()),
      ActionImport: this.ActionImport?.map((a) => a.toJson()),
    };
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

  toConfig(): EntityContainerConfig {
    return {
      name: this.Name,
      annotations: this.Annotation?.map((t) => t.toConfig()),
      entitySets: this.EntitySet?.map((t) => t.toConfig()),
    };
  }
}
