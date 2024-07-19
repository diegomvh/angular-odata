import { CsdlAnnotable, CsdlAnnotation } from './csdl-annotation';

export class CsdlTypeDefinition extends CsdlAnnotable {
  constructor(
    public name: string,
    public underlayingType: string,
    public maxLength?: number,
    public precision?: number,
    public scale?: number,
    public unicode?: boolean,
    public srid?: string,
    annotations?: CsdlAnnotation[],
  ) {
    super(annotations);
  }

  override toJson() {
    return {
      ...super.toJson(),
      Name: this.Name,
      UnderlayingType: this.UnderlayingType,
      MaxLength: this.MaxLength,
      Precision: this.Precision,
      Scale: this.Scale,
      Unicode: this.Unicode,
      SRID: this.SRID,
    };
  }
}
