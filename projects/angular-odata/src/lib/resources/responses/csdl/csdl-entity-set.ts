import { CsdlAnnotable, CsdlAnnotation } from './csdl-annotation';
import { CsdlNavigationPropertyBinding } from './csdl-navigation-property-binding';

export class CsdlEntitySet extends CsdlAnnotable {
  constructor(
    public name: string,
    public entityType: string,
    public navigationPropertyBinding?: CsdlNavigationPropertyBinding[],
    public includeInServiceDocument?: boolean,
    annotationList?: CsdlAnnotation[],
  ) {
    super(annotationList);
  }
}
