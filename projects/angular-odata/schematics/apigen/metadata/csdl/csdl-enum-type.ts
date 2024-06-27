import { CsdlAnnotable, CsdlAnnotation } from "./csdl-annotation";

export class CsdlEnumType extends CsdlAnnotable {
  constructor(
    public name: string,
    public members: CsdlMember[],
    public underlyingType?: string,
    public isFlags?: boolean,
    annotations?: CsdlAnnotation[],
  ) {
    super(annotations)
  }
}

export class CsdlMember extends CsdlAnnotable {
  constructor(
    public name: string,
    public value?: number,
    annotations?: CsdlAnnotation[],
  ) {
    super(annotations)
  }
}
