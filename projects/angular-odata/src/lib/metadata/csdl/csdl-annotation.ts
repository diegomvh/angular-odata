import { AnnotationConfig } from "../../types";

export class CsdlAnnotable {
  constructor(public annotations?: CsdlAnnotation[]) {}
}

export class CsdlAnnotations extends CsdlAnnotable {
  constructor(
    public target: string,
    annotations: CsdlAnnotation[],
    public qualifier?: string,
  ) {
    super(annotations);
  }

  toConfig(): AnnotationConfig[] {
    return (this.annotations?? []).map(a => a.toConfig());
  }
}

export class CsdlAnnotation {
  constructor(
    public term: string,
    public string?: string,
    public bool?: boolean,
    public int?: number,
    public collection?: any,
    public record?: any,
    public members?: any,
  ) {}

  toConfig(): AnnotationConfig {
    return {
      term: this.term,
      string: this.string,
      bool: this.bool,
      int: this.int,
    } as AnnotationConfig;
  }
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

export class CsdlCollection {
  constructor(
    public strings: CsdlString[],
    public records: CsdlRecord[],
    public propertyPaths: CsdlPropertyPath[],
    public navigationPropertyPaths: CsdlNavigationPropertyPath[],
  ) {}

  toConfig() {
    return {
    }
  }
}

export class CsdlRecord {
  constructor(public properties: CsdlPropertyValue[]) {}

  toConfig() {
    return {
    }
  }
}

export class CsdlPropertyValue {
  constructor(public name: string, public string?: string, public date?: Date, public members?: CsdlEnumMember[]) {}

  toConfig() {
    return {
    }
  }
}

export class CsdlEnumMember {
  constructor(
    public text: string,
  ) {}
}

export class CsdlString {
  constructor(
    public text: string,
  ) {}
}

export class CsdlPropertyPath {
  constructor(
    public text: string,
  ) {}
}

export class CsdlNavigationPropertyPath {
  constructor(
    public text: string,
  ) {}
}