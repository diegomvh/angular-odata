import { StructuredTypeConfig } from '../../types';
import { CsdlAnnotable } from './csdl-annotation';
import {
  CsdlProperty,
  CsdlNavigationProperty,
} from './csdl-structural-property';
import type { CsdlSchema } from './csdl-schema';

export class CsdlStructuredType extends CsdlAnnotable {
  Name: string;
  Property?: CsdlProperty[];
  NavigationProperty?: CsdlNavigationProperty[];
  BaseType?: string;
  OpenType?: boolean;
  Abstract?: boolean;

  constructor(
    private schema: CsdlSchema,
    {
      Name,
      Property,
      NavigationProperty,
      BaseType,
      OpenType,
      Abstract,
      Annotation,
    }: {
      Name: string;
      Property?: any[];
      NavigationProperty?: any[];
      BaseType?: string;
      OpenType?: boolean;
      Abstract?: boolean;
      Annotation?: any[];
    },
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

  override toJson() {
    return {
      ...super.toJson(),
      Name: this.Name,
      Property: this.Property?.map((p) => p.toJson()),
      NavigationProperty: this.NavigationProperty?.map((n) => n.toJson()),
      BaseType: this.BaseType,
      OpenType: this.OpenType,
      Abstract: this.Abstract,
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
}

export class CsdlComplexType extends CsdlStructuredType {
  constructor(
    schema: CsdlSchema,
    {
      Name,
      Property,
      NavigationProperty,
      BaseType,
      OpenType,
      Abstract,
      Annotation,
    }: {
      Name: string;
      Property?: any[];
      NavigationProperty?: any[];
      BaseType?: string;
      OpenType?: boolean;
      Abstract?: boolean;
      Annotation?: any[];
    },
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
  
  override toJson() {
    return {
      ...super.toJson(),
    };
  }

  override toConfig(): StructuredTypeConfig {
    return {
      ...super.toConfig(),
      name: this.Name,
      base: this.BaseType,
      open: this.OpenType,
      fields: [
        ...(this.Property ?? []).map((t) => t.toConfig()),
        ...(this.NavigationProperty ?? []).map((t) => t.toConfig()),
      ].reduce((acc, p) => Object.assign(acc, { [p.name]: p }), {}),
    } as StructuredTypeConfig;
  }
}

export class CsdlEntityType extends CsdlStructuredType {
  Key?: CsdlKey;
  HasStream?: boolean;

  constructor(
    schema: CsdlSchema,
    {
      Name,
      Key,
      Property,
      NavigationProperty,
      BaseType,
      OpenType,
      Abstract,
      HasStream,
      Annotation,
    }: {
      Name: string;
      Key?: any;
      Property?: any[];
      NavigationProperty?: any[];
      BaseType?: string;
      OpenType?: boolean;
      Abstract?: boolean;
      HasStream?: boolean;
      Annotation?: any[];
    },
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

  override toJson() {
    return {
      ...super.toJson(),
      Key: this.Key?.toJson(),
      HasStream: this.HasStream,
    };
  }

  override toConfig(): StructuredTypeConfig {
    return {
      ...super.toConfig(),
      name: this.Name,
      base: this.BaseType,
      open: this.OpenType,
      keys: this.Key?.toConfig(),
      fields: [
        ...(this.Property ?? []).map((t) => t.toConfig()),
        ...(this.NavigationProperty ?? []).map((t) => t.toConfig()),
      ].reduce((acc, p) => Object.assign(acc, { [p.name]: p }), {}),
    } as StructuredTypeConfig;
  }
}

export class CsdlKey {
  PropertyRefs: CsdlPropertyRef[];

  constructor({ PropertyRefs }: { PropertyRefs: any[] }) {
    this.PropertyRefs = PropertyRefs?.map((p) => new CsdlPropertyRef(p));
  }

  toJson() {
    return {
      PropertyRefs: this.PropertyRefs?.map((p) => p.toJson()),
    };
  }

  toConfig() {
    return this.PropertyRefs?.map((t) => t.toConfig());
  }
}

export class CsdlPropertyRef {
  Name: string;
  Alias?: string;

  constructor({ Name, Alias }: { Name: string; Alias?: string }) {
    this.Name = Name;
    this.Alias = Alias;
  }

  toJson() {
    return {
      Name: this.Name,
      Alias: this.Alias,
    };
  }

  toConfig(): { name: string; alias?: string } {
    return {
      name: this.Name,
      alias: this.Alias,
    };
  }
}
