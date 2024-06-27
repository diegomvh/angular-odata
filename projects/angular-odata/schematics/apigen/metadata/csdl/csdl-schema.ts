import {
  CsdlTerm,
  CsdlAnnotations,
} from './csdl-annotation';
import { CsdlTypeDefinition } from './csdl-type-definition';
import { CsdlEnumType } from './csdl-enum-type';
import { CsdlEntityType, CsdlComplexType } from './csdl-structured-type';
import { CsdlFunction, CsdlAction } from './csdl-function-action';
import { CsdlEntityContainer } from './csdl-entity-container';

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
}
