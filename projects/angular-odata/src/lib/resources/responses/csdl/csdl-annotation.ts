export class CsdlAnnotable {
  constructor(public annotationList?: CsdlAnnotation[]) {}
}

export class CsdlAnnotations extends CsdlAnnotable {
  constructor(
    public target: string,
    annotationList: CsdlAnnotation[],
    public qualifier?: string,
  ) {
    super(annotationList);
  }
}

export class CsdlAnnotation {
  constructor(
    public term: string,
    public string?: string,
    public bool?: boolean,
    public int?: number,
  ) {}
}

export class CsdlTerm {
  constructor(
    public name: string,
    public type: string,
    public baseTerm?: string,
    public defaultValue?: string,
    public appliesTo?: string,
    public nullable?: boolean,
    public maxLength?: number,
    public precision?: number,
    public scale?: number,
    public srid?: string,
    public string?: string,
    public bool?: boolean,
    public int?: number,
  ) {}
}
