import { CsdlAnnotable } from "./csdl-annotation";

export abstract class CsdlStructuralProperty extends CsdlAnnotable {
  Name: string;
  Type: string;
  Collection: boolean;
  Nullable?: boolean;

  constructor({
    Name,
    Type,
    Nullable,
    Annotation,
  }: {
    Name: string;
    Type: string;
    Nullable?: boolean;
    Annotation?: any[];
  }) {
    super({Annotation});
    this.Name = Name;
    this.Nullable = Nullable;
    this.Collection = Type.startsWith("Collection(");
    this.Type = this.Collection ? Type.substring(11, Type.length - 1) : Type;
  }
}

export class CsdlProperty extends CsdlStructuralProperty {
  MaxLength?: number;
  Precision?: number;
  Scale?: number;
  Unicode?: boolean;
  SRID?: string;
  DefaultValue?: string;

  constructor({
    Name,
    Type,
    Nullable,
    MaxLength,
    Precision,
    Scale,
    Unicode,
    SRID,
    DefaultValue,
    Annotation,
  }: {
    Name: string;
    Type: string;
    Nullable?: boolean;
    MaxLength?: number;
    Precision?: number;
    Scale?: number;
    Unicode?: boolean;
    SRID?: string;
    DefaultValue?: string;
    Annotation?: any[];
  }) {
    super({Name, Type, Nullable, Annotation});
    this.MaxLength = MaxLength;
    this.Precision = Precision;
    this.Scale = Scale;
    this.Unicode = Unicode;
    this.SRID = SRID;
    this.DefaultValue = DefaultValue;
  }

}

export class CsdlNavigationProperty extends CsdlStructuralProperty {
  public Partner?: string;
  public ContainsTarget?: boolean;
  public ReferentialConstraints?: CsdlReferentialConstraint[];
  public OnDelete?: CsdlOnDelete;

  constructor({
    Name,
    Type,
    Nullable,
    Partner,
    ContainsTarget,
    ReferentialConstraints,
    OnDelete,
    Annotation
  }: {
    Name: string;
    Type: string;
    Nullable?: boolean;
    Partner?: string;
    ContainsTarget?: boolean;
    ReferentialConstraints?: any[];
    OnDelete?: any;
    Annotation?: any[];
  }) {
    super({Name, Type, Nullable, Annotation});
    this.Partner = Partner;
    this.ContainsTarget = ContainsTarget;
    this.ReferentialConstraints = ReferentialConstraints?.map(r => new CsdlReferentialConstraint(r));
    this.OnDelete = OnDelete ? new CsdlOnDelete(OnDelete) : undefined;
  }
}

export class CsdlReferentialConstraint {
  Property: string;
  ReferencedProperty: string;

  constructor({Property, ReferencedProperty}: {Property: string, ReferencedProperty: string}) {
    this.Property = Property;
    this.ReferencedProperty = ReferencedProperty;
  }
}

export class CsdlOnDelete {
  Action: string;

  constructor({Action}: {Action: string}) {
    this.Action = Action;
  }
}
