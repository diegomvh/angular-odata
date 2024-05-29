import { CsdlAnnotable, CsdlAnnotation } from "./csdl-annotation";

export class CsdlEnumType extends CsdlAnnotable {
  constructor(
    public name: string,
    public members: CsdlEnumMember[],
    public underlyingType?: string,
    public isFlags?: boolean,
    annotationList?: CsdlAnnotation[],
  ) {
    super(annotationList)
  }
}

export class CsdlEnumMember extends CsdlAnnotable {
  constructor(
    public name: string,
    public value?: number,
    annotationList?: CsdlAnnotation[],
  ) {
    super(annotationList)
  }
}
