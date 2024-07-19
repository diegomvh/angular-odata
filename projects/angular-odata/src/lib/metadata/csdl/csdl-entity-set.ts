import { EntitySetConfig } from '../../types';
import { CsdlAnnotable, CsdlAnnotation } from './csdl-annotation';
import { CsdlNavigationPropertyBinding } from './csdl-navigation-property-binding';

export class CsdlEntitySet extends CsdlAnnotable {
  constructor(
    public name: string,
    public entityType: string,
    public navigationPropertyBinding?: CsdlNavigationPropertyBinding[],
    public includeInServiceDocument?: boolean,
    annotations?: CsdlAnnotation[],
  ) {
    super({ Annotation });

    this.Name = Name;
    this.EntityType = EntityType;
    this.NavigationPropertyBinding = NavigationPropertyBinding?.map(
      (n) => new CsdlNavigationPropertyBinding(n),
    );
    this.IncludeInServiceDocument = IncludeInServiceDocument;
  }

  fullName() {
    return `${this.container.Namespace}.${this.Name}`;
  }

  toConfig(): EntitySetConfig {
    return {
      name: this.name,
      entityType: this.entityType,
      service: {},
      annotations: this.annotations?.map(t => t.toConfig()),
    } as EntitySetConfig;
  }
}
