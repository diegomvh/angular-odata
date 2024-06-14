import { StructuredTypeFieldConfig } from "../../types";
import { CsdlAnnotable, CsdlAnnotation } from "./csdl-annotation";

export abstract class CsdlStructuralProperty extends CsdlAnnotable {
  type: string;
  collection: boolean;
  constructor(
    public name: string,
    type: string,
    public nullable?: boolean,
    annotations?: CsdlAnnotation[],
  ) {
    super(annotations);
    this.collection = type.startsWith("Collection(");
    this.type = this.collection ? type.substring(11, type.length - 1) : type;
  }
}

export class CsdlProperty extends CsdlStructuralProperty {
  constructor(
    name: string,
    type: string,
    nullable?: boolean,
    public maxLength?: number,
    public precision?: number,
    public scale?: number,
    public unicode?: boolean,
    public srid?: string,
    public defaultValue?: string,
    annotations?: CsdlAnnotation[],
  ) {
    super(name, type, nullable, annotations);
  }

  toConfig() {
    return {
      name: this.name,
      type: this.type,
      default: this.defaultValue,
      maxLength: this.maxLength,
      collection: this.collection,
      nullable: this.nullable,
      navigation: false,
      precision: this.precision,
      scale: this.scale,
      annotations: this.annotations?.map(a => a.toConfig()),
    } as StructuredTypeFieldConfig & {name: string};
  }
}

export class CsdlNavigationProperty extends CsdlStructuralProperty {
  constructor(
    name: string,
    type: string,
    nullable?: boolean,
    public partner?: string,
    public containsTarget?: boolean,
    public referentialConstraints?: CsdlReferentialConstraint[],
    public onDelete?: CsdlOnDelete,
    annotations?: CsdlAnnotation[],
  ) {
    super(name, type, nullable, annotations);
  }

  toConfig() {
    return {
      name: this.name,
      type: this.type,
      collection: this.collection,
      nullable: this.nullable,
      navigation: true,
      annotations: this.annotations?.map(a => a.toConfig()),
      referentials: this.referentialConstraints?.map(r => ({ property: r.property, referencedProperty: r.referencedProperty })),
    } as StructuredTypeFieldConfig & {name: string};
  }
}

export class CsdlReferentialConstraint {
  constructor(
    public property: string,
    public referencedProperty: string,
  ) {}
}

export class CsdlOnDelete {
  constructor(public action: string) {}
}
