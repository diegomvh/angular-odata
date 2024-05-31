import { EnumTypeConfig, EnumTypeFieldConfig } from "../../../types";
import { CsdlAnnotable, CsdlAnnotation } from "./csdl-annotation";

export class CsdlEnumType extends CsdlAnnotable {
  constructor(
    public name: string,
    public members: CsdlEnumMember[],
    public underlyingType?: string,
    public isFlags?: boolean,
    annotations?: CsdlAnnotation[],
  ) {
    super(annotations)
  }

  toConfig(): EnumTypeConfig<any> {
    return {
      name: this.name,
      annotations: this.annotations?.map(a => a.toConfig()),
      members: this.members.map(m => m.toConfig()),
      fields: {},
      flags: this.isFlags,
    } as EnumTypeConfig<any>;
  }
}

export class CsdlEnumMember extends CsdlAnnotable {
  constructor(
    public name: string,
    public value?: number,
    annotations?: CsdlAnnotation[],
  ) {
    super(annotations)
  }

  toConfig(): EnumTypeFieldConfig<any> {
    return {
      value: this.value,
      annotations: this.annotations?.map(a => a.toConfig()),
    } as EnumTypeFieldConfig<any>;
  }
}
