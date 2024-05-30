import { CsdlEntitySet } from './csdl-entity-set';
import { CsdlSingleton } from './csdl-singleton';
import { CsdlFunctionImport, CsdlActionImport } from './csdl-function-action';
import { CsdlAnnotable, CsdlAnnotation } from './csdl-annotation';

export class CsdlEntityContainer extends CsdlAnnotable {
  constructor(
    public name: string,
    public extend?: string,
    public entitySets?: CsdlEntitySet[],
    public singletons?: CsdlSingleton[],
    public functionImports?: CsdlFunctionImport[],
    public actionImports?: CsdlActionImport[],
    annotationList?: CsdlAnnotation[],
  ) {
    super(annotationList);
  }
}
