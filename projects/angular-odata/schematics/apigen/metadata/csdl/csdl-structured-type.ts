import { CsdlAnnotable } from './csdl-annotation';
import {
  CsdlProperty,
  CsdlNavigationProperty,
} from './csdl-structural-property';
import type { CsdlSchema } from "./csdl-schema";

export class CsdlStructuredType extends CsdlAnnotable {
  Name: string;
  Property?: CsdlProperty[];
  NavigationProperty?: CsdlNavigationProperty[];
  BaseType?: string;
  OpenType?: boolean;
  Abstract?: boolean;

  constructor(private schema: CsdlSchema, 
    {
      Name,
      Property,
      NavigationProperty,
      BaseType,
      OpenType,
      Abstract,
      Annotation,
    }: {
      Name: string,
      Property?: any[],
      NavigationProperty?: any[],
      BaseType?: string,
      OpenType?: boolean,
      Abstract?: boolean,
      Annotation?: any[],
    },
  ) {
    super({ Annotation });
    this.Name = Name;
    this.Property = Property?.map(p => new CsdlProperty(p));
    this.NavigationProperty = NavigationProperty?.map(n => new CsdlNavigationProperty(n));
    this.BaseType = BaseType;
    this.OpenType = OpenType;
    this.Abstract = Abstract;
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
  constructor(schema: CsdlSchema, 
    {
      Name,
      Property,
      NavigationProperty,
      BaseType,
      OpenType,
      Abstract,
      Annotation,
    }: {
      Name: string,
      Property?: any[],
      NavigationProperty?: any[],
      BaseType?: string,
      OpenType?: boolean,
      Abstract?: boolean,
      Annotation?: any[],
    },
  ) {
    super(schema, {
      Name,
      Property,
      NavigationProperty,
      BaseType,
      OpenType,
      Abstract,
      Annotation
    });
  }
}

export class CsdlEntityType extends CsdlStructuredType {
  Key?: CsdlKey;
  HasStream?: boolean;

  constructor(schema: CsdlSchema, 
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
      Name: string,
      Key?: any,
      Property?: any[],
      NavigationProperty?: any[],
      BaseType?: string,
      OpenType?: boolean,
      Abstract?: boolean,
      HasStream?: boolean,
      Annotation?: any[],
    },
  ) {
    super(schema, {
      Name,
      Property,
      NavigationProperty,
      BaseType,
      OpenType,
      Abstract,
      Annotation
    });
    this.Key = Key ? new CsdlKey(Key) : undefined;
    this.HasStream = HasStream;
  }
}

export class CsdlKey {
  PropertyRefs: CsdlPropertyRef[];

  constructor({ PropertyRefs }: { PropertyRefs: any[] }) {
    this.PropertyRefs = PropertyRefs?.map(p => new CsdlPropertyRef(p));
  }
}

export class CsdlPropertyRef {
  Name: string;
  Alias?: string;

  constructor({ Name, Alias }: { Name: string, Alias?: string }) {
    this.Name = Name;
    this.Alias = Alias;
  }
}
