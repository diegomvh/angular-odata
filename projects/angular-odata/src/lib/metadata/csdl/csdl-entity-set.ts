import { EntitySetConfig } from '../../types';
import { CsdlAnnotable } from './csdl-annotation';
import type { CsdlEntityContainer } from './csdl-entity-container';
import { CsdlNavigationPropertyBinding } from './csdl-navigation-property-binding';

export class CsdlEntitySet extends CsdlAnnotable {
  public Name: string;
  public EntityType: string;
  public NavigationPropertyBinding?: CsdlNavigationPropertyBinding[];
  public IncludeInServiceDocument?: boolean;

  constructor(
    private container: CsdlEntityContainer,
    {
      Name,
      EntityType,
      NavigationPropertyBinding,
      IncludeInServiceDocument,
      Annotation,
    }: {
      Name: string;
      EntityType: string;
      NavigationPropertyBinding?: any[];
      IncludeInServiceDocument?: boolean;
      Annotation?: any[];
    },
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
      name: this.Name,
      entityType: this.EntityType,
      service: {},
      annotations: this.Annotation?.map((t) => t.toConfig()),
    } as EntitySetConfig;
  }
}
