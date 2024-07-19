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
    const json: {[key: string]: any} = {...super.toJson(), Name: this.Name, Member: this.Member.map((m) => m.toJson())};
    if (this.UnderlyingType) {
      json['UnderlyingType'] = this.UnderlyingType;
    }
    if (this.IsFlags) {
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
    const json: {[key: string]: any} = {...super.toJson(), Name: this.Name};
    if (this.Value) {
      json['Value'] = this.Value;
    }
    return json;
  }
}
