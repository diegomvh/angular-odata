import { CsdlAnnotable, CsdlAnnotation } from './csdl-annotation';
import { CsdlNavigationPropertyBinding } from './csdl-navigation-property-binding';

export class CsdlSingleton extends CsdlAnnotable {
  constructor(
    public name: string,
    public type: string,
    public navigationPropertyBindings?: CsdlNavigationPropertyBinding[],
    annotations?: CsdlAnnotation[],
  ) {
    super({ Annotation });
    this.Name = Name;
    this.Type = Type;
    this.NavigationPropertyBindings = NavigationPropertyBindings?.map(
      (n) => new CsdlNavigationPropertyBinding(n),
    );
  }

  fullName() {
    return `${this.container.Namespace}.${this.Name}`;
  }
}
