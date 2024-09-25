import { EnumTypeConfig, EnumTypeFieldConfig } from '../../types';
import { CsdlAnnotable } from './csdl-annotation';
import type { CsdlSchema } from './csdl-schema';

export class CsdlEnumType extends CsdlAnnotable {
  Name: string;
  Member: CsdlMember[];
  UnderlyingType?: string;
  IsFlags?: boolean;
  constructor(
    private schema: CsdlSchema,
    {
      Name,
      Member,
      UnderlyingType,
      IsFlags,
      Annotation,
    }: {
      Name: string;
      Member: any[];
      UnderlyingType?: string;
      IsFlags?: boolean;
      Annotation?: any[];
    },
  ) {
    super({ Annotation });
    this.Name = Name;
    this.Member = Member.map((m) => new CsdlMember(m));
    this.UnderlyingType = UnderlyingType;
    this.IsFlags = IsFlags;
  }

  override toJson() {
    const json: { [key: string]: any } = {
      ...super.toJson(),
      Name: this.Name,
      Member: this.Member.map((m) => m.toJson()),
    };
    if (this.UnderlyingType !== undefined) {
      json['UnderlyingType'] = this.UnderlyingType;
    }
    if (this.IsFlags !== undefined) {
      json['IsFlags'] = this.IsFlags;
    }
    return json;
  }

  name() {
    return `${this.Name}`;
  }

  namespace() {
    return `${this.schema.Namespace}`;
  }

  fullName() {
    return `${this.schema.Namespace}.${this.Name}`;
  }

  override toConfig(base?: Partial<EnumTypeConfig>): EnumTypeConfig {
    return {
      ...super.toConfig(),
      name: this.Name,
      fields: this.Member.reduce(
        (acc, m) => ({
          ...acc,
          [m.Name]: m.toConfig(),
        }),
        {},
      ),
      flags: this.IsFlags,
    } as EnumTypeConfig;
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

  override toJson() {
    const json: { [key: string]: any } = { ...super.toJson(), Name: this.Name };
    if (this.Value !== undefined) {
      json['Value'] = this.Value;
    }
    return json;
  }

  override toConfig(base?: Partial<EnumTypeFieldConfig>): EnumTypeFieldConfig {
    const config: { [key: string]: any } = {
      ...super.toConfig(),
      value: this.Value,
    };
    return config as EnumTypeFieldConfig;
  }
}
