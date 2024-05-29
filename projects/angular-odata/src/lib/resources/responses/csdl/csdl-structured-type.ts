import { CsdlAnnotable, CsdlAnnotation } from './csdl-annotation';
import {
  CsdlProperty,
  CsdlNavigationProperty,
} from './csdl-structural-property';

export class CsdlStructuredType extends CsdlAnnotable {
  constructor(
    public name: string,
    public properties?: CsdlProperty[],
    public navigationProperties?: CsdlNavigationProperty[],
    public baseType?: string,
    public openType?: boolean,
    public abstract?: boolean,
    annotationList?: CsdlAnnotation[],
  ) {
    super(annotationList);
  }
}

export class CsdlComplexType extends CsdlStructuredType {
  constructor(
    name: string,
    properties?: CsdlProperty[],
    navigationProperties?: CsdlNavigationProperty[],
    baseType?: string,
    openType?: boolean,
    abstract?: boolean,
    annotationList?: CsdlAnnotation[],
  ) {
    super(name, properties, navigationProperties, baseType, openType, abstract, annotationList);
  }
}

export class CsdlEntityType extends CsdlStructuredType {
  constructor(
    name: string,
    public key?: CsdlKey,
    properties?: CsdlProperty[],
    navigationProperties?: CsdlNavigationProperty[],
    baseType?: string,
    openType?: boolean,
    abstract?: boolean,
    public hasStream?: boolean,
    annotationList?: CsdlAnnotation[],
  ) {
    super(name, properties, navigationProperties, baseType, openType, abstract, annotationList);
  }
}

export class CsdlKey {
  constructor(public propertyRefs: CsdlPropertyRef[]) {}
}

export class CsdlPropertyRef {
  constructor(
    public name: string,
    public alias?: string,
  ) {}
}
