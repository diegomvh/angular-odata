import { CsdlTerm, CsdlAnnotations } from './csdl-annotation';
import { CsdlTypeDefinition } from './csdl-type-definition';
import { CsdlEnumType } from './csdl-enum-type';
import { CsdlEntityType, CsdlComplexType } from './csdl-structured-type';
import { CsdlFunction, CsdlAction } from './csdl-function-action';
import { CsdlEntityContainer } from './csdl-entity-container';
import type { ODataSchemaConfig } from '../../types';

export class CsdlSchema {
  Namespace: string;
  Alias?: string;
  EnumType?: CsdlEnumType[];
  ComplexType?: CsdlComplexType[];
  EntityType?: CsdlEntityType[];
  Function?: CsdlFunction[];
  Action?: CsdlAction[];
  EntityContainer?: CsdlEntityContainer[];
  TypeDefinition?: CsdlTypeDefinition[];
  Term?: CsdlTerm[];
  Annotations?: CsdlAnnotations[];
  constructor({
    Namespace,
    Alias,
    EnumType,
    ComplexType,
    EntityType,
    Function,
    Action,
    EntityContainer,
    TypeDefinition,
    Term,
    Annotations,
  }: {
    Namespace: string;
    Alias?: string;
    EnumType?: any[];
    ComplexType?: any[];
    EntityType?: any[];
    Function?: any[];
    Action?: any[];
    EntityContainer?: any[];
    TypeDefinition?: any[];
    Term?: any[];
    Annotations?: any[];
  }) {
    this.Namespace = Namespace;
    this.Alias = Alias;
    this.EnumType = EnumType?.map((e) => new CsdlEnumType(this, e));
    this.ComplexType = ComplexType?.map((c) => new CsdlComplexType(this, c));
    this.EntityType = EntityType?.map((e) => new CsdlEntityType(this, e));
    this.Function = Function?.map((f) => new CsdlFunction(this, f));
    this.Action = Action?.map((a) => new CsdlAction(this, a));
    this.EntityContainer = EntityContainer?.map((e) => new CsdlEntityContainer(this, e));
    this.TypeDefinition = TypeDefinition?.map((t) => new CsdlTypeDefinition(this, t));
    this.Term = Term?.map((t) => new CsdlTerm(this, t));
    this.Annotations = Annotations?.map((a) => new CsdlAnnotations(this, a));
  }

  toJson() {
    const json: { [key: string]: any } = {
      Namespace: this.Namespace,
    };
    if (this.Alias !== undefined) {
      json['Alias'] = this.Alias;
    }
    if (Array.isArray(this.EntityContainer) && this.EntityContainer.length > 0) {
      json['EntityContainer'] = this.EntityContainer.map((a) => a.toJson());
    }
    if (Array.isArray(this.EntityType) && this.EntityType.length > 0) {
      json['EntityType'] = this.EntityType.map((a) => a.toJson());
    }
    if (Array.isArray(this.ComplexType) && this.ComplexType.length > 0) {
      json['ComplexType'] = this.ComplexType.map((a) => a.toJson());
    }
    if (Array.isArray(this.EnumType) && this.EnumType.length > 0) {
      json['EnumType'] = this.EnumType.map((a) => a.toJson());
    }
    if (Array.isArray(this.TypeDefinition) && this.TypeDefinition.length > 0) {
      json['TypeDefinition'] = this.TypeDefinition.map((a) => a.toJson());
    }
    if (Array.isArray(this.Term) && this.Term.length > 0) {
      json['Term'] = this.Term.map((a) => a.toJson());
    }
    if (Array.isArray(this.Annotations) && this.Annotations.length > 0) {
      json['Annotations'] = this.Annotations.map((a) => a.toJson());
    }
    if (Array.isArray(this.Action) && this.Action.length > 0) {
      json['Action'] = this.Action.map((a) => a.toJson());
    }
    if (Array.isArray(this.Function) && this.Function.length > 0) {
      json['Function'] = this.Function.map((a) => a.toJson());
    }
    return json;
  }

  toConfig(base?: Partial<ODataSchemaConfig>): ODataSchemaConfig {
    return {
      namespace: this.Namespace,
      alias: base?.alias ?? this.Alias,
      annotations: this.Annotations?.map((t) => t.toConfig()),
      enums: this.EnumType?.map((t) => t.toConfig(base?.enums?.find((cs) => cs.name === t.Name))),
      entities: [
        ...(this.ComplexType ?? []).map((t) =>
          t.toConfig(base?.entities?.find((cs) => cs.name === t.Name)),
        ),
        ...(this.EntityType ?? []).map((t) =>
          t.toConfig(base?.entities?.find((cs) => cs.name === t.Name)),
        ),
      ],
      callables: [
        ...(this.Function ?? []).map((t) =>
          t.toConfig(base?.callables?.find((cs) => cs.name === t.Name)),
        ),
        ...(this.Action ?? []).map((t) =>
          t.toConfig(base?.callables?.find((cs) => cs.name === t.Name)),
        ),
      ],
      containers: this.EntityContainer?.map((t) =>
        t.toConfig(base?.containers?.find((cs) => cs.name === t.Name)),
      ),
    } as ODataSchemaConfig;
  }
}
