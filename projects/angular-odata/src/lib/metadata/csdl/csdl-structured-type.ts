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

  toConfig(): StructuredTypeConfig<any> {
    const fields = {};
    return {
      name: this.Name,
      base: this.BaseType,
      open: this.OpenType,
      annotations: this.Annotation?.map((t) => t.toConfig()),
      fields: [
        ...(this.Property ?? []).map((t) => t.toConfig()),
        ...(this.NavigationProperty ?? []).map((t) => t.toConfig()),
      ].reduce((acc, p) => Object.assign(acc, { [p.name]: p }), {}),
    } as StructuredTypeConfig<any>;
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

  toConfig(): StructuredTypeConfig<any> {
    return {
      name: this.Name,
      base: this.BaseType,
      open: this.OpenType,
      annotations: this.Annotation?.map((t) => t.toConfig()),
      keys: this.Key?.toConfig(),
      fields: [
        ...(this.Property ?? []).map((t) => t.toConfig()),
        ...(this.NavigationProperty ?? []).map((t) => t.toConfig()),
      ].reduce((acc, p) => Object.assign(acc, { [p.name]: p }), {}),
    } as StructuredTypeConfig<any>;
  }
}

export class CsdlKey {
  PropertyRefs: CsdlPropertyRef[];

  constructor({ PropertyRefs }: { PropertyRefs: any[] }) {
    this.PropertyRefs = PropertyRefs?.map((p) => new CsdlPropertyRef(p));
  }

  toConfig() {
    return this.PropertyRefs.map((t) => t.toConfig());
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
      name: this.Name,
      alias: this.Alias,
    };
  }
}
