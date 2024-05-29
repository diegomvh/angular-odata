import { CsdlAnnotable, CsdlAnnotation } from "./csdl-annotation";

export abstract class CsdlStructuralProperty extends CsdlAnnotable {
  constructor(
    public name: string,
    public type: string,
    public nullable?: boolean,
    annotationList?: CsdlAnnotation[],
  ) {
    super(annotationList);
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
    annotationList?: CsdlAnnotation[],
  ) {
    super(name, type, nullable, annotationList);
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
    annotationList?: CsdlAnnotation[],
  ) {
    super(name, type, nullable, annotationList);
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
