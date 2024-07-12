import type { CsdlSchema } from "./csdl-schema";

export class CsdlAnnotable {
  Annotation?: CsdlAnnotation[]
  constructor({ Annotation }: { Annotation?: any[] }) {
    this.Annotation = Annotation?.map(a => new CsdlAnnotation(a));
  }
}

export class CsdlAnnotations extends CsdlAnnotable {
  Target: string;
  Qualifier?: string;
  constructor(private schema: CsdlSchema, { Target, Qualifier, Annotation }: {
    Target: string,
    Qualifier?: string,
    Annotation: CsdlAnnotation[],
  }
  ) {
    super({ Annotation });
    this.Target = Target;
    this.Qualifier = Qualifier;
  }
}

export class CsdlAnnotation {
  Term: string;
  String?: string;
  Bool?: boolean;
  Int?: number;
  Collection?: any;
  Record?: any;
  Members?: any;
  constructor({ Term, String, Bool, Int, Collection, Record, Members }: {
    Term: string,
    String?: string,
    Bool?: boolean,
    Int?: number,
    Collection?: any,
    Record?: any,
    Members?: any,
  }) {
    this.Term = Term;
    this.String = String;
    this.Bool = Bool;
    this.Int = Int;
    this.Collection = Collection;
    this.Record = Record;
    this.Members = Members;
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
  constructor(private schema: CsdlSchema, { Name, Type, BaseTerm, DefaultValue, AppliesTo, Nullable, MaxLength, Precision, Scale, SRID, String, Bool, Int }: {
    Name: string,
    Type: string,
    BaseTerm?: string,
    DefaultValue?: string,
    AppliesTo?: string,
    Nullable?: boolean,
    MaxLength?: number,
    Precision?: number,
    Scale?: number,
    SRID?: string,
    String?: string,
    Bool?: boolean,
    Int?: number,
  }) {
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
}

export class CsdlCollection {
  Strings: CsdlString[];
  Records: CsdlRecord[];
  PropertyPaths: CsdlPropertyPath[];
  NavigationPropertyPaths: CsdlNavigationPropertyPath[];
  constructor({ Strings, Records, PropertyPaths, NavigationPropertyPaths }: {
    Strings: CsdlString[],
    Records: CsdlRecord[],
    PropertyPaths: CsdlPropertyPath[],
    NavigationPropertyPaths: CsdlNavigationPropertyPath[],
  }
  ) {
    this.Strings = Strings;
    this.Records = Records;
    this.PropertyPaths = PropertyPaths;
    this.NavigationPropertyPaths = NavigationPropertyPaths;
  }
}

export class CsdlRecord {
  Properties: CsdlPropertyValue[]
  constructor({Properties}: {Properties: CsdlPropertyValue[]}) { 
    this.Properties = Properties;
  }
}

export class CsdlPropertyValue {
  Name: string; 
  String?: string; 
  Date?: Date; 
  Members?: CsdlEnumMember[];
  constructor({ Name, String, Date, Members }: { Name: string, String?: string, Date?: Date, Members?: CsdlEnumMember[] }) {
    this.Name = Name;
    this.String = String;
    this.Date = Date;
    this.Members = Members;
  }
}

export class CsdlEnumMember {
  TextContent: string;
  constructor({TextContent}: {TextContent: string }) { 
    this.TextContent = TextContent;
  }
}

export class CsdlString {
  TextContent: string;
  constructor({TextContent}: {TextContent: string }) { 
    this.TextContent = TextContent;
  }
}

export class CsdlPropertyPath {
  TextContent: string;
  constructor({TextContent}: {TextContent: string }) { 
    this.TextContent = TextContent;
  }
}

export class CsdlNavigationPropertyPath {
  TextContent: string;
  constructor({TextContent}: {TextContent: string }) { 
    this.TextContent = TextContent;
  }
}
