import {
  CsdlAnnotation,
  CsdlAnnotable,
  CsdlTerm,
  CsdlAnnotations,
} from './csdl-annotation';
import { CsdlTypeDefinition } from './csdl-type-definition';
import { CsdlEnumType } from './csdl-enum-type';
import { CsdlEntityType, CsdlComplexType } from './csdl-structured-type';
import { CsdlFunction, CsdlAction } from './csdl-function-action';
import { CsdlEntityContainer } from './csdl-entity-container';
import { SchemaConfig } from '../../../types';

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

  toConfig(): SchemaConfig {
    return {
      namespace: this.namespace,
      alias: this.alias,
      annotations: this.annotations?.map(t => t.toConfig()),
      enums: this.enumTypes?.map(t => t.toConfig()),
      entities: this.entityTypes?.map(t => t.toConfig()),
      callables: [...(this.functions ?? []).map(t => t.toConfig()), ...(this.actions ?? []).map(t => t.toConfig())],
      containers: this.entityContainers?.map(t => t.toConfig())
    } as SchemaConfig;
  }
}
