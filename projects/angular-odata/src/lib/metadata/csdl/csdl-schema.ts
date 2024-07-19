import {
  CsdlTerm,
  CsdlAnnotations,
} from './csdl-annotation';
import { CsdlTypeDefinition } from './csdl-type-definition';
import { CsdlEnumType } from './csdl-enum-type';
import { CsdlEntityType, CsdlComplexType } from './csdl-structured-type';
import { CsdlFunction, CsdlAction } from './csdl-function-action';
import { CsdlEntityContainer } from './csdl-entity-container';
import { SchemaConfig } from '../../types';

export class CsdlSchema {
  constructor(
    public namespace: string,
    public alias?: string,
    public enumTypes?: CsdlEnumType[],
    public complexTypes?: CsdlComplexType[],
    public entityTypes?: CsdlEntityType[],
    public functions?: CsdlFunction[],
    public actions?: CsdlAction[],
    public entityContainers?: CsdlEntityContainer[],
    public typeDefinitions?: CsdlTypeDefinition[],
    public terms?: CsdlTerm[],
    public annotations?: CsdlAnnotations[],
  ) { }

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
      namespace: this.namespace,
      alias: this.alias,
      annotations: this.annotations?.map(t => t.toConfig()),
      enums: this.enumTypes?.map(t => t.toConfig()),
      entities: [...(this.complexTypes ?? []).map(t => t.toConfig()), ...(this.entityTypes ?? []).map(t => t.toConfig())],
      callables: [...(this.functions ?? []).map(t => t.toConfig()), ...(this.actions ?? []).map(t => t.toConfig())],
      containers: this.entityContainers?.map(t => t.toConfig())
    } as SchemaConfig;
  }
}
