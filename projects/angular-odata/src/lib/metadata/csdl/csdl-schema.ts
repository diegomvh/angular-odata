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

  toJson() {
    return {
      Namespace: this.Namespace,
      Alias: this.Alias,
      EnumType: this.EnumType?.map((e) => e.toJson()),
      ComplexType: this.ComplexType?.map((c) => c.toJson()),
      EntityType: this.EntityType?.map((e) => e.toJson()),
      Function: this.Function?.map((f) => f.toJson()),
      Action: this.Action?.map((a) => a.toJson()),
      EntityContainer: this.EntityContainer?.map((e) => e.toJson()),
      TypeDefinition: this.TypeDefinition?.map((t) => t.toJson()),
      Term: this.Term?.map((t) => t.toJson()),
      Annotations: this.Annotations?.map((a) => a.toJson()),
    }
  }

  toConfig(): SchemaConfig {
    return {
      namespace: this.Namespace,
      alias: this.Alias,
      annotations: this.Annotations?.map((t) => t.toConfig()),
      enums: this.EnumType?.map((t) => t.toConfig()),
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
