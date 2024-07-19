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
    super({ Annotation });
    this.Name = Name;
    this.UnderlayingType = UnderlayingType;
    this.MaxLength = MaxLength;
    this.Precision = Precision;
    this.Scale = Scale;
    this.Unicode = Unicode;
    this.SRID = SRID;
  }
}
