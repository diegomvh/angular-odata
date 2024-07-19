import { AnnotationConfig } from '../../types';
import type { CsdlSchema } from './csdl-schema';

export class CsdlAnnotable {
  Annotation?: CsdlAnnotation[];
  constructor({ Annotation }: { Annotation?: any[] }) {
    this.Annotation = Annotation?.map((a) => new CsdlAnnotation(a));
  }

  toJson() {
    const json: {[key: string]: any} = {};
    if (this.Annotation) {
      json['Annotation'] = this.Annotation.map((a) => a.toJson());
    }
    return json;
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
      Annotation: CsdlAnnotation[];
    },
  ) {
    super({ Annotation });
    this.Target = Target;
    this.Qualifier = Qualifier;
  }
  
  override toJson() {
    const json: {[key: string]: any} = {...super.toJson(), Target: this.Target};
    if (this.Qualifier) {
      json['Qualifier'] = this.Qualifier;
    }
    return json;
  }

  toConfig(): AnnotationConfig[] {
    return (this.Annotation ?? []).map((a) => a.toConfig());
  }
}

export class CsdlAnnotation {
  Term: string;
  String?: string;
  Bool?: boolean;
  Int?: number;
  Collection?: any;
  Record?: any;
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
    Collection?: any;
    Record?: any;
    EnumMember?: any[];
  }) {
    this.Term = Term;
    this.String = String;
    this.Bool = Bool;
    this.Int = Int;
    this.Collection = Collection;
    this.Record = Record;
    this.EnumMember = EnumMember?.map((a) => new CsdlEnumMember(a));
  }
  
  toJson() {
    const json: {[key: string]: any} = {Term: this.Term};
    if (this.String) {
      json['String'] = this.String;
    }
    if (this.Bool) {
      json['Bool'] = this.Bool;
    }
    if (this.Int) {
      json['Int'] = this.Int;
    }
    if (this.Collection) {
      json['Collection'] = this.Collection;
    }
    if (this.Record) {
      json['Record'] = this.Record;
    }
    if (this.EnumMember) {
      json['EnumMember'] = this.EnumMember.map((m) => m.toJson());
    }
    return json ;
  }

  toConfig(): AnnotationConfig {
    return {
      term: this.Term,
      string: this.String,
      bool: this.Bool,
      int: this.Int,
    } as AnnotationConfig;
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
    const json: {[key: string]: any} = {Name: this.Name, Type: this.Type};
    if (this.BaseTerm) {
      json['BaseTerm'] = this.BaseTerm;
    }
    if (this.DefaultValue) {
      json['DefaultValue'] = this.DefaultValue;
    }
    if (this.AppliesTo) {
      json['AppliesTo'] = this.AppliesTo;
    }
    if (this.Nullable) {
      json['Nullable'] = this.Nullable;
    }
    if (this.MaxLength) {
      json['MaxLength'] = this.MaxLength;
    }
    if (this.Precision) {
      json['Precision'] = this.Precision;
    }
    if (this.Scale) {
      json['Scale'] = this.Scale;
    }
    if (this.SRID) {
      json['SRID'] = this.SRID;
    }
    if (this.String) {
      json['String'] = this.String;
    }
    if (this.Bool) {
      json['Bool'] = this.Bool;
    }
    if (this.Int) {
      json['Int'] = this.Int;
    }
    return json;
  }
}

export class CsdlCollection {
  Strings: CsdlString[];
  Records: CsdlRecord[];
  PropertyPaths: CsdlPropertyPath[];
  NavigationPropertyPaths: CsdlNavigationPropertyPath[];
  constructor({
    Strings,
    Records,
    PropertyPaths,
    NavigationPropertyPaths,
  }: {
    Strings: CsdlString[];
    Records: CsdlRecord[];
    PropertyPaths: CsdlPropertyPath[];
    NavigationPropertyPaths: CsdlNavigationPropertyPath[];
  }) {
    this.Strings = Strings;
    this.Records = Records;
    this.PropertyPaths = PropertyPaths;
    this.NavigationPropertyPaths = NavigationPropertyPaths;
  }

  toJson() {
    const json: {[key: string]: any} = {};
    if (this.Strings) {
      json['Strings'] = this.Strings.map((s) => s.toJson());
    } 
    if (this.Records) {
      json['Records'] = this.Records.map((r) => r.toJson());
    }
    if (this.PropertyPaths) {
      json['PropertyPaths'] = this.PropertyPaths.map((p) => p.toJson());
    }
    if (this.NavigationPropertyPaths) {
      json['NavigationPropertyPaths'] = this.NavigationPropertyPaths.map((p) => p.toJson());
    }
    return json;
  }
}

export class CsdlRecord {
  Properties: CsdlPropertyValue[];
  constructor({ Properties }: { Properties: CsdlPropertyValue[] }) {
    this.Properties = Properties;
  }

  toJson() {
    const json: {[key: string]: any} = {};
    if (this.Properties) {
      json['Properties'] = this.Properties.map((p) => p.toJson());
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
    const json: {[key: string]: any} = { Name: this.Name, };
    if (this.String) {
      json['String'] = this.String;
    }
    if (this.Date) {
      json['Date'] = this.Date;
    }
    if (this.EnumMember) {
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
