import { CallableConfig, ParameterConfig } from '../../types';
import { CsdlAnnotable } from './csdl-annotation';
import type { CsdlEntityContainer } from './csdl-entity-container';
import type { CsdlSchema } from './csdl-schema';

export const BINDING_PARAMETER_NAME: string = 'bindingParameter';

export class CsdlCallable {
  Name: string;
  ReturnType?: CsdlReturnType;
  IsBound?: boolean;
  EntitySetPath?: string;
  Parameter?: CsdlParameter[];

  constructor(
    private schema: CsdlSchema,
    {
      Name,
      ReturnType,
      IsBound,
      EntitySetPath,
      Parameter,
    }: {
      Name: string;
      ReturnType?: any;
      IsBound?: boolean;
      EntitySetPath?: string;
      Parameter?: any[];
    },
  ) {
    this.Name = Name;
    this.ReturnType = ReturnType ? new CsdlReturnType(ReturnType) : undefined;
    this.IsBound = IsBound;
    this.EntitySetPath = EntitySetPath;
    this.Parameter = Parameter?.map((p) => new CsdlParameter(p));
  }

  toJson() {
    const json: {[key: string]: any} = {
      Name: this.Name,
    }
    if (this.ReturnType) {
      json['ReturnType'] = this.ReturnType.toJson();
    }
    if (this.IsBound) {
      json['IsBound'] = this.IsBound;
    }
    if (this.EntitySetPath) {
      json['EntitySetPath'] = this.EntitySetPath;
    }
    if (this.Parameter) {
      json['Parameter'] = this.Parameter.map((p) => p.toJson());
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
    return `${this.namespace()}.${this.Name}`;
  }
}
export class CsdlFunction extends CsdlCallable {
  IsComposable?: boolean;

  constructor(
    schema: CsdlSchema,
    {
      Name,
      ReturnType,
      IsBound,
      EntitySetPath,
      IsComposable,
      Parameter,
    }: {
      Name: string;
      ReturnType: any;
      IsBound?: boolean;
      EntitySetPath?: string;
      IsComposable?: boolean;
      Parameter?: any[];
    },
  ) {
    super(schema, { Name, ReturnType, IsBound, EntitySetPath, Parameter });
    this.IsComposable = IsComposable;
  }

  override toJson() {
    return {
      ...super.toJson(),
      IsComposable: this.IsComposable,
    }
  }

  toConfig(): CallableConfig {
    return {
      name: this.Name,
      entitySetPath: this.EntitySetPath,
      bound: this.IsBound,
      composable: this.IsComposable,
      parameters: this.Parameter?.map((p) => p.toConfig()),
      return: this.ReturnType?.toConfig(),
    } as CallableConfig;
  }
}

export class CsdlAction extends CsdlCallable {
  constructor(
    schema: CsdlSchema,
    {
      Name,
      ReturnType,
      IsBound,
      EntitySetPath,
      Parameter,
    }: {
      Name: string;
      ReturnType?: any;
      IsBound?: boolean;
      EntitySetPath?: string;
      Parameter?: any[];
    },
  ) {
    super(schema, { Name, ReturnType, IsBound, EntitySetPath, Parameter });
  }

  override toJson() {
    return {
      ...super.toJson(),
    }
  }

  toConfig(): CallableConfig {
    return {
      name: this.Name,
      entitySetPath: this.EntitySetPath,
      bound: this.IsBound,
      parameters: this.Parameter?.map((p) => p.toConfig()),
      return: this.ReturnType?.toConfig(),
    } as CallableConfig;
  }
}

export class CsdlFunctionImport {
  Name: string;
  FunctionName: string;
  EntitySet?: string;
  IncludeInServiceDocument?: boolean;

  constructor(
    private container: CsdlEntityContainer,
    {
      Name,
      FunctionName,
      EntitySet,
      IncludeInServiceDocument,
    }: {
      Name: string;
      FunctionName: string;
      EntitySet?: string;
      IncludeInServiceDocument?: boolean;
    },
  ) {
    this.Name = Name;
    this.FunctionName = FunctionName;
    this.EntitySet = EntitySet;
    this.IncludeInServiceDocument = IncludeInServiceDocument;
  }

  toJson() {
    return {
      Name: this.Name,
      FunctionName: this.FunctionName,
      EntitySet: this.EntitySet,
      IncludeInServiceDocument: this.IncludeInServiceDocument,
    };
  }
}

export class CsdlActionImport {
  Name: string;
  Action: string;
  EntitySet?: string;

  constructor(
    private container: CsdlEntityContainer,
    {
      Name,
      Action,
      EntitySet,
    }: {
      Name: string;
      Action: string;
      EntitySet?: string;
    },
  ) {
    this.Name = Name;
    this.Action = Action;
    this.EntitySet = EntitySet;
  }

  toJson() {
    return {
      Name: this.Name,
      Action: this.Action,
      EntitySet: this.EntitySet,
    };
  }
}

export class CsdlParameter extends CsdlAnnotable {
  Name: string;
  Type: string;
  Collection: boolean;
  Nullable?: boolean;
  MaxLength?: number;
  Precision?: number;
  Scale?: number;
  SRID?: string;

  constructor({
    Name,
    Type,
    Nullable,
    MaxLength,
    Precision,
    Scale,
    SRID,
    Annotation,
  }: {
    Name: string;
    Type: string;
    Nullable?: boolean;
    MaxLength?: number;
    Precision?: number;
    Scale?: number;
    SRID?: string;
    Annotation?: any[];
  }) {
    super({ Annotation });
    this.Name = Name;
    this.Collection = Type.startsWith('Collection(');
    this.Type = this.Collection ? Type.substring(11, Type.length - 1) : Type;
    this.Nullable = Nullable;
    this.MaxLength = MaxLength;
    this.Precision = Precision;
    this.Scale = Scale;
    this.SRID = SRID;
  }

  override toJson() {
    return {
      ...super.toJson(),
      Name: this.Name,
      Type: this.Collection ? `Collection(${this.Type})` : this.Type,
      Nullable: this.Nullable,
      MaxLength: this.MaxLength,
      Precision: this.Precision,
      Scale: this.Scale,
      SRID: this.SRID,
    };
  }

  override toConfig(): ParameterConfig {
    return {
      ...super.toConfig(),
      type: this.Type,
      nullable: this.Nullable,
      collection: false,
    };
  }
}

export class CsdlReturnType {
  Type: string;
  Collection: boolean;
  Nullable?: boolean;
  MaxLength?: number;
  Precision?: number;
  Scale?: number;
  SRID?: string;

  constructor({
    Type,
    Nullable,
    MaxLength,
    Precision,
    Scale,
    SRID,
  }: {
    Type: string;
    Nullable?: boolean;
    MaxLength?: number;
    Precision?: number;
    Scale?: number;
    SRID?: string;
  }) {
    this.Collection = Type.startsWith('Collection(');
    this.Type = this.Collection ? Type.substring(11, Type.length - 1) : Type;
    this.Nullable = Nullable;
    this.MaxLength = MaxLength;
    this.Precision = Precision;
    this.Scale = Scale;
    this.SRID = SRID;
  }

  toJson() {
    return {
      Type: this.Collection ? `Collection(${this.Type})` : this.Type,
      Nullable: this.Nullable,
      MaxLength: this.MaxLength,
      Precision: this.Precision,
      Scale: this.Scale,
      SRID: this.SRID,
    };
  }

  toConfig(): { type: string; collection?: boolean | undefined } | undefined {
    return {
      type: this.Type,
      collection: false,
    };
  }
}
