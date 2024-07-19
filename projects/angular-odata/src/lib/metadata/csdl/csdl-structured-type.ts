import { StructuredTypeConfig } from '../../types';
import { CsdlAnnotable, CsdlAnnotation } from './csdl-annotation';
import {
  CsdlProperty,
  CsdlNavigationProperty,
} from './csdl-structural-property';

export class CsdlStructuredType extends CsdlAnnotable {
  constructor(
    public name: string,
    public properties?: CsdlProperty[],
    public navigationProperties?: CsdlNavigationProperty[],
    public baseType?: string,
    public openType?: boolean,
    public abstract?: boolean,
    annotations?: CsdlAnnotation[],
  ) {
    super({ Annotation });
    this.Name = Name;
    this.Property = Property?.map((p) => new CsdlProperty(p));
    this.NavigationProperty = NavigationProperty?.map(
      (n) => new CsdlNavigationProperty(n),
    );
    this.BaseType = BaseType;
    this.OpenType = OpenType;
    this.Abstract = Abstract;
  }

  fullName() {
    return `${this.schema.Namespace}.${this.Name}`;
  }
}

export class CsdlComplexType extends CsdlStructuredType {
  constructor(
    name: string,
    properties?: CsdlProperty[],
    navigationProperties?: CsdlNavigationProperty[],
    baseType?: string,
    openType?: boolean,
    abstract?: boolean,
    annotations?: CsdlAnnotation[],
  ) {
    super(schema, {
      Name,
      Property,
      NavigationProperty,
      BaseType,
      OpenType,
      Abstract,
      Annotation,
    });
  }

  toConfig(): StructuredTypeConfig<any> {
    const fields = {};
    return {
      name: this.name,
      base: this.baseType,
      open: this.openType,
      annotations: this.annotations?.map(t => t.toConfig()),
      fields: [...(this.properties ?? []).map(t => t.toConfig()), ...(this.navigationProperties ?? []).map(t => t.toConfig())].reduce((acc, p) => Object.assign(acc, {[p.name]: p}), {}),
    } as StructuredTypeConfig<any>;
  }
}

export class CsdlEntityType extends CsdlStructuredType {
  constructor(
    name: string,
    public key?: CsdlKey,
    properties?: CsdlProperty[],
    navigationProperties?: CsdlNavigationProperty[],
    baseType?: string,
    openType?: boolean,
    abstract?: boolean,
    public hasStream?: boolean,
    annotations?: CsdlAnnotation[],
  ) {
    super(schema, {
      Name,
      Property,
      NavigationProperty,
      BaseType,
      OpenType,
      Abstract,
      Annotation,
    });
    this.Key = Key ? new CsdlKey(Key) : undefined;
    this.HasStream = HasStream;
  }

  toConfig(): StructuredTypeConfig<any> {
    const fields = {};
    return {
      name: this.name,
      base: this.baseType,
      open: this.openType,
      annotations: this.annotations?.map(t => t.toConfig()),
      keys: this.key?.toConfig(),
      fields: [...(this.properties ?? []).map(t => t.toConfig()), ...(this.navigationProperties ?? []).map(t => t.toConfig())].reduce((acc, p) => Object.assign(acc, {[p.name]: p}), {}),
    } as StructuredTypeConfig<any>;
  }
}

export class CsdlKey {
  PropertyRefs: CsdlPropertyRef[];

  constructor({ PropertyRefs }: { PropertyRefs: any[] }) {
    this.PropertyRefs = PropertyRefs?.map((p) => new CsdlPropertyRef(p));
  }

  toConfig() {
    return this.propertyRefs.map(t => t.toConfig());
  }
}

export class CsdlPropertyRef {
  Name: string;
  Alias?: string;

  constructor({ Name, Alias }: { Name: string; Alias?: string }) {
    this.Name = Name;
    this.Alias = Alias;
  }

  toConfig(): { name: string; alias?: string } {
    return {
      name: this.name,
      alias: this.alias
    }
  }
}
