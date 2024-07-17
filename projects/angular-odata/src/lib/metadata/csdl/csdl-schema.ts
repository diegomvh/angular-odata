import { CsdlTerm, CsdlAnnotations } from './csdl-annotation';
import { CsdlTypeDefinition } from './csdl-type-definition';
import { CsdlEnumType } from './csdl-enum-type';
import { CsdlEntityType, CsdlComplexType } from './csdl-structured-type';
import { CsdlFunction, CsdlAction } from './csdl-function-action';
import { CsdlEntityContainer } from './csdl-entity-container';
import { SchemaConfig } from '../../types';

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
    this.EntityContainer = EntityContainer?.map(
      (e) => new CsdlEntityContainer(this, e),
    );
    this.TypeDefinition = TypeDefinition?.map(
      (t) => new CsdlTypeDefinition(this, t),
    );
    this.Term = Term?.map((t) => new CsdlTerm(this, t));
    this.Annotations = Annotations?.map((a) => new CsdlAnnotations(this, a));
  }

  toConfig(): SchemaConfig {
    return {
      namespace: this.Namespace,
      alias: this.Alias,
      annotations: this.Annotations?.map((t) => t.toConfig()),
      enums: this.EntityType?.map((t) => t.toConfig()),
      entities: [
        ...(this.ComplexType ?? []).map((t) => t.toConfig()),
        ...(this.EntityType ?? []).map((t) => t.toConfig()),
      ],
      callables: [
        ...(this.Function ?? []).map((t) => t.toConfig()),
        ...(this.Action ?? []).map((t) => t.toConfig()),
      ],
      containers: this.EntityContainer?.map((t) => t.toConfig()),
    } as SchemaConfig;
  }
}
