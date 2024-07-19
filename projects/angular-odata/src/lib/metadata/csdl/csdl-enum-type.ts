import { EnumTypeConfig, EnumTypeFieldConfig } from "../../types";
import { CsdlAnnotable, CsdlAnnotation } from "./csdl-annotation";

export class CsdlEnumType extends CsdlAnnotable {
  constructor(
    public name: string,
    public members: CsdlMember[],
    public underlyingType?: string,
    public isFlags?: boolean,
    annotations?: CsdlAnnotation[],
  ) {
    super({ Annotation });
    this.Name = Name;
    this.Member = Member.map((m) => new CsdlMember(m));
    this.UnderlyingType = UnderlyingType;
    this.IsFlags = IsFlags;
  }

  fullName() {
    return `${this.schema.Namespace}.${this.Name}`;
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

export class CsdlMember extends CsdlAnnotable {
  Name: string;
  Value?: number;
  constructor({
    Name,
    Value,
    Annotation,
  }: {
    Name: string;
    Value?: number;
    Annotation?: any[];
  }) {
    super({ Annotation });
    this.Name = Name;
    this.Value = Value;
  }

  toConfig(): EnumTypeFieldConfig<any> {
    return {
      value: this.value,
      annotations: this.annotations?.map(a => a.toConfig()),
    } as EnumTypeFieldConfig<any>;
  }
}
