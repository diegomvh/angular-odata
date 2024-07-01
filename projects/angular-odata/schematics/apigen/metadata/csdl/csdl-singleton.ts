import { CsdlAnnotable, CsdlAnnotation } from './csdl-annotation';
import { CsdlNavigationPropertyBinding } from './csdl-navigation-property-binding';

export class CsdlSingleton extends CsdlAnnotable {
  entityType: string;
  constructor(
    public name: string,
    public type: string,
    public navigationPropertyBindings?: CsdlNavigationPropertyBinding[],
    annotations?: CsdlAnnotation[],
  ) {
    super(annotations);
    this.entityType = this.type;
  }
}
