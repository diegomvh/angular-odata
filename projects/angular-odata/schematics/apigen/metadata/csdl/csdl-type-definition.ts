import { CsdlAnnotable, CsdlAnnotation } from './csdl-annotation';
import type { CsdlSchema } from "./csdl-schema";

export class CsdlTypeDefinition extends CsdlAnnotable {
  public Name: string;
  public UnderlayingType: string;
  public MaxLength?: number;
  public Precision?: number;
  public Scale?: number;
  public Unicode?: boolean;
  public SRID?: string;

  constructor(private schema: CsdlSchema, {Name, UnderlayingType, MaxLength, Precision, Scale, Unicode, SRID, Annotation}: {
    Name: string;
    UnderlayingType: string;
    MaxLength?: number;
    Precision?: number;
    Scale?: number;
    Unicode?: boolean;
    SRID?: string;
    Annotation?: CsdlAnnotation[];
  }) {
    super({Annotation});
    this.Name = Name;
    this.UnderlayingType = UnderlayingType;
    this.MaxLength = MaxLength;
    this.Precision = Precision;
    this.Scale = Scale;
    this.Unicode = Unicode;
    this.SRID = SRID;
  }
}
