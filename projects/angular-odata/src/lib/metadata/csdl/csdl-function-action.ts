import { CallableConfig, ParameterConfig } from "../../types";
import { CsdlAnnotable, CsdlAnnotation } from "./csdl-annotation";

export class CsdlFunction {
  constructor(
    public name: string,
    public returnType: CsdlReturnType,
    public isBound?: boolean,
    public entitySetPath?: string,
    public isComposable?: boolean,
    public parameters?: CsdlParameter[],
  ) {}

  toConfig(): CallableConfig {
    return {
      name: this.name,
      entitySetPath: this.entitySetPath,
      bound: this.isBound,
      composable: this.isComposable,
      parameters: this.parameters?.map(p => p.toConfig()),
      return: this.returnType?.toConfig(),
    } as CallableConfig;
  }
}

export class CsdlAction {
  constructor(
    public name: string,
    public returnType?: CsdlReturnType,
    public isBound?: boolean,
    public entitySetPath?: string,
    public parameters?: CsdlParameter[],
  ) {}

  toConfig(): CallableConfig {
    return {
      name: this.name,
      entitySetPath: this.entitySetPath,
      bound: this.isBound,
      parameters: this.parameters?.map(p => p.toConfig()),
      return: this.returnType?.toConfig(),
    } as CallableConfig;
  }
}

export class CsdlFunctionImport {
  constructor(
    public name: string,
    public functionName: string,
    public entitySet?: string,
    public IncludeInServiceDocument?: boolean,
  ) {}
}

export class CsdlActionImport {
  constructor(
    public name: string,
    public action: string,
    public entitySet?: string,
  ) {}
}

export class CsdlParameter extends CsdlAnnotable {
  constructor(
    public name: string,
    public type: string,
    public nullable?: boolean,
    public maxLength?: number,
    public precision?: number,
    public scale?: number,
    public srid?: string,
    annotations?: CsdlAnnotation[],
  ) {
    super(annotations);
  }

  toConfig(): ParameterConfig {
    return {
      type: this.type,
      nullable: this.nullable,
      collection: false
    }
  }
}

export class CsdlReturnType {
  constructor(
    public type: string,
    public nullable?: boolean,
    public maxLength?: number,
    public precision?: number,
    public scale?: number,
    public srid?: string,
  ) {}

  toConfig(): { type: string; collection?: boolean | undefined; } | undefined {
    return {
      type: this.type,
      collection: false
    };
  }
}
