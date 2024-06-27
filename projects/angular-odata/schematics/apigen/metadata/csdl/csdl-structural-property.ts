import { toTypescriptType } from "../../utils";
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

  tsType() {
    return toTypescriptType(this.type);
  }

  tsName() {
    return this.name; 
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
