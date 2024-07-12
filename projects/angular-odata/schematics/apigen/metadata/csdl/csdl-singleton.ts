import { CsdlAnnotable } from './csdl-annotation';
import type { CsdlEntityContainer } from './csdl-entity-container';
import { CsdlNavigationPropertyBinding } from './csdl-navigation-property-binding';

export class CsdlSingleton extends CsdlAnnotable {
  Name: string;
  Type: string;
  NavigationPropertyBindings?: CsdlNavigationPropertyBinding[];

  constructor(private container: CsdlEntityContainer, {
    Name,
    Type,
    NavigationPropertyBindings,
    Annotation,
  }: {
    Name: string;
    Type: string;
    NavigationPropertyBindings?: any[];
    Annotation?: any[];
  }) {
    super({Annotation});
    this.Name = Name;
    this.Type = Type;
    this.NavigationPropertyBindings = NavigationPropertyBindings?.map(n => new CsdlNavigationPropertyBinding(n));
  }

  name() {
    return `${this.Name}`;
  }

  namespace() {
    return `${this.container.namespace()}`;
  }
  fullName() {
    return `${this.container.namespace()}.${this.Name}`;
  }
}
