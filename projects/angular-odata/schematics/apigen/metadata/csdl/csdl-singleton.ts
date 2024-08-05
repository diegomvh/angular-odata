import { CsdlAnnotable } from './csdl-annotation';
import type { CsdlEntityContainer } from './csdl-entity-container';
import { CsdlNavigationPropertyBinding } from './csdl-navigation-property-binding';

export class CsdlSingleton extends CsdlAnnotable {
  Name: string;
  Type: string;
  NavigationPropertyBindings?: CsdlNavigationPropertyBinding[];

  constructor(
    private container: CsdlEntityContainer,
    {
      Name,
      Type,
      NavigationPropertyBindings,
      Annotation,
    }: {
      Name: string;
      Type: string;
      NavigationPropertyBindings?: any[];
      Annotation?: any[];
    },
  ) {
    super({ Annotation });
    this.Name = Name;
    this.Type = Type;
    this.NavigationPropertyBindings = NavigationPropertyBindings?.map(
      (n) => new CsdlNavigationPropertyBinding(n),
    );
  }

  override toJson() {
    const json: {[key: string]: any} = {
      ...super.toJson(),
      Name: this.Name,
      Type: this.Type,
    };
    if (Array.isArray(this.NavigationPropertyBindings) && this.NavigationPropertyBindings.length) {
      json['NavigationPropertyBindings'] = this.NavigationPropertyBindings.map((n) => n.toJson());
    }
    return json;
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
