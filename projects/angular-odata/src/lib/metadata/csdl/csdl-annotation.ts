import { ODataAnnotationConfig } from '../../types';
import type { CsdlSchema } from './csdl-schema';

export class CsdlAnnotable {
  Annotation?: CsdlAnnotation[];
  constructor({ Annotation }: { Annotation?: any[] }) {
    this.Annotation = Annotation?.map((a) => new CsdlAnnotation(a));
  }

  toJson() {
    const json: { [key: string]: any } = {};
    if (Array.isArray(this.Annotation) && this.Annotation.length > 0) {
      json['Annotation'] = this.Annotation.map((a) => a.toJson());
    }
    return json;
  }

  toConfig() {
    const config: { [key: string]: any } = {};
    if (this.Annotation) {
      config['annotations'] = this.Annotation.map((a) => a.toConfig());
    }
    return config;
  }
}

export class CsdlAnnotations extends CsdlAnnotable {
  Target: string;
  Qualifier?: string;
  constructor(
    private schema: CsdlSchema,
    {
      Target,
      Qualifier,
      Annotation,
    }: {
      Target: string;
      Qualifier?: string;
      Annotation: any[];
    },
  ) {
    super({ Annotation });
    this.Target = Target;
    this.Qualifier = Qualifier;
  }

  override toJson() {
    const json: { [key: string]: any } = {
      ...super.toJson(),
      Target: this.Target,
    };
    if (this.Qualifier !== undefined) {
      json['Qualifier'] = this.Qualifier;
    }
    return json;
  }

  override toConfig(): ODataAnnotationConfig[] {
    return (this.Annotation ?? []).map((a) => a.toConfig());
  }
}

export class CsdlAnnotation {
  Term: string;
  String?: string;
  Bool?: boolean;
  Int?: number;
  Collection?: CsdlCollection[];
  Record?: CsdlRecord[];
  EnumMember?: CsdlEnumMember[];
  constructor({
    Term,
    String,
    Bool,
    Int,
    Collection,
    Record,
    EnumMember,
  }: {
    Term: string;
    String?: string;
    Bool?: boolean;
    Int?: number;
    Collection?: any[];
    Record?: any[];
    EnumMember?: any[];
  }) {
    this.Term = Term;
    this.String = String;
    this.Bool = Bool;
    this.Int = Int;
    this.Collection = Collection?.map((a) => new CsdlCollection(a));
    this.Record = Record?.map((a) => new CsdlRecord(a));
    this.EnumMember = EnumMember?.map((a) => new CsdlEnumMember(a));
  }

  toJson() {
    const json: { [key: string]: any } = { Term: this.Term };
    if (this.String !== undefined) {
      json['String'] = this.String;
    }
    if (this.Bool !== undefined) {
      json['Bool'] = this.Bool;
    }
    if (this.Int !== undefined) {
      json['Int'] = this.Int;
    }
    if (Array.isArray(this.Collection) && this.Collection.length > 0) {
      json['Collection'] = this.Collection.map((m) => m.toJson());
    }
    if (Array.isArray(this.Record) && this.Record.length > 0) {
      json['Record'] = this.Record.map((m) => m.toJson());
    }
    if (Array.isArray(this.EnumMember) && this.EnumMember.length > 0) {
      json['EnumMember'] = this.EnumMember.map((m) => m.toJson());
    }
    return json;
  }

  toConfig(): ODataAnnotationConfig {
    return {
      term: this.Term,
      string: this.String,
      bool: this.Bool,
      int: this.Int,
    } as ODataAnnotationConfig;
  }
}

export class CsdlTerm {
  Name: string;
  Type: string;
  BaseTerm?: string;
  DefaultValue?: string;
  AppliesTo?: string;
  Nullable?: boolean;
  MaxLength?: number;
  Precision?: number;
  Scale?: number;
  SRID?: string;
  String?: string;
  Bool?: boolean;
  Int?: number;
  constructor(
    private schema: CsdlSchema,
    {
      Name,
      Type,
      BaseTerm,
      DefaultValue,
      AppliesTo,
      Nullable,
      MaxLength,
      Precision,
      Scale,
      SRID,
      String,
      Bool,
      Int,
    }: {
      Name: string;
      Type: string;
      BaseTerm?: string;
      DefaultValue?: string;
      AppliesTo?: string;
      Nullable?: boolean;
      MaxLength?: number;
      Precision?: number;
      Scale?: number;
      SRID?: string;
      String?: string;
      Bool?: boolean;
      Int?: number;
    },
  ) {
    this.Name = Name;
    this.Type = Type;
    this.BaseTerm = BaseTerm;
    this.DefaultValue = DefaultValue;
    this.AppliesTo = AppliesTo;
    this.Nullable = Nullable;
    this.MaxLength = MaxLength;
    this.Precision = Precision;
    this.Scale = Scale;
    this.SRID = SRID;
    this.String = String;
    this.Bool = Bool;
    this.Int = Int;
  }

  toJson() {
    const json: { [key: string]: any } = { Name: this.Name, Type: this.Type };
    if (this.BaseTerm !== undefined) {
      json['BaseTerm'] = this.BaseTerm;
    }
    if (this.DefaultValue !== undefined) {
      json['DefaultValue'] = this.DefaultValue;
    }
    if (this.AppliesTo !== undefined) {
      json['AppliesTo'] = this.AppliesTo;
    }
    if (this.Nullable !== undefined) {
      json['Nullable'] = this.Nullable;
    }
    if (this.MaxLength !== undefined) {
      json['MaxLength'] = this.MaxLength;
    }
    if (this.Precision !== undefined) {
      json['Precision'] = this.Precision;
    }
    if (this.Scale !== undefined) {
      json['Scale'] = this.Scale;
    }
    if (this.SRID !== undefined) {
      json['SRID'] = this.SRID;
    }
    if (this.String !== undefined) {
      json['String'] = this.String;
    }
    if (this.Bool !== undefined) {
      json['Bool'] = this.Bool;
    }
    if (this.Int !== undefined) {
      json['Int'] = this.Int;
    }
    return json;
  }
}

export class CsdlCollection {
  String: CsdlString[];
  Record: CsdlRecord[];
  PropertyPath: CsdlPropertyPath[];
  NavigationPropertyPath: CsdlNavigationPropertyPath[];
  constructor({
    String,
    Record,
    PropertyPath,
    NavigationPropertyPath,
  }: {
    String: any[];
    Record: any[];
    PropertyPath: any[];
    NavigationPropertyPath: any[];
  }) {
    this.String = String?.map((a) => new CsdlString(a));
    this.Record = Record?.map((a) => new CsdlRecord(a));
    this.PropertyPath = PropertyPath?.map((a) => new CsdlPropertyPath(a));
    this.NavigationPropertyPath = NavigationPropertyPath?.map(
      (a) => new CsdlNavigationPropertyPath(a),
    );
  }

  toJson() {
    const json: { [key: string]: any } = {};
    if (Array.isArray(this.String) && this.String.length > 0) {
      json['String'] = this.String.map((s) => s.toJson());
    }
    if (Array.isArray(this.Record) && this.Record.length > 0) {
      json['Record'] = this.Record.map((r) => r.toJson());
    }
    if (Array.isArray(this.PropertyPath) && this.PropertyPath.length > 0) {
      json['PropertyPath'] = this.PropertyPath.map((p) => p.toJson());
    }
    if (
      Array.isArray(this.NavigationPropertyPath) &&
      this.NavigationPropertyPath.length > 0
    ) {
      json['NavigationPropertyPath'] = this.NavigationPropertyPath.map((p) =>
        p.toJson(),
      );
    }
    return json;
  }
}

export class CsdlRecord {
  PropertyValue: CsdlPropertyValue[];
  constructor({ PropertyValue }: { PropertyValue: any[] }) {
    this.PropertyValue = PropertyValue?.map((a) => new CsdlPropertyValue(a));
  }

  toJson() {
    const json: { [key: string]: any } = {};
    if (Array.isArray(this.PropertyValue) && this.PropertyValue.length > 0) {
      json['PropertyValue'] = this.PropertyValue.map((p) => p.toJson());
    }
    return json;
  }
}

export class CsdlPropertyValue {
  Name: string;
  String?: string;
  Date?: Date;
  EnumMember?: CsdlEnumMember[];
  constructor({
    Name,
    String,
    Date,
    EnumMember,
  }: {
    Name: string;
    String?: string;
    Date?: Date;
    EnumMember?: any[];
  }) {
    this.Name = Name;
    this.String = String;
    this.Date = Date;
    this.EnumMember = EnumMember?.map((a) => new CsdlEnumMember(a));
  }

  toJson() {
    const json: { [key: string]: any } = { Name: this.Name };
    if (this.String !== undefined) {
      json['String'] = this.String;
    }
    if (this.Date !== undefined) {
      json['Date'] = this.Date;
    }
    if (Array.isArray(this.EnumMember) && this.EnumMember.length > 0) {
      json['EnumMember'] = this.EnumMember.map((m) => m.toJson());
    }
    return json;
  }
}

export class CsdlEnumMember {
  TextContent: string;
  constructor({ TextContent }: { TextContent: string }) {
    this.TextContent = TextContent;
  }

  toJson() {
    return {
      TextContent: this.TextContent,
    };
  }
}

export class CsdlString {
  TextContent: string;
  constructor({ TextContent }: { TextContent: string }) {
    this.TextContent = TextContent;
  }

  toJson() {
    return {
      TextContent: this.TextContent,
    };
  }
}

export class CsdlPropertyPath {
  TextContent: string;
  constructor({ TextContent }: { TextContent: string }) {
    this.TextContent = TextContent;
  }

  toJson() {
    return {
      TextContent: this.TextContent,
    };
  }
}

export class CsdlNavigationPropertyPath {
  TextContent: string;
  constructor({ TextContent }: { TextContent: string }) {
    this.TextContent = TextContent;
  }

  toJson() {
    return {
      TextContent: this.TextContent,
    };
  }
}
