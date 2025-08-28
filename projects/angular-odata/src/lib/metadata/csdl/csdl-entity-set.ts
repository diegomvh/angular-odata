import { ODataEntitySetConfig } from '../../types';
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

  override toJson() {
    const json: { [key: string]: any } = {
      ...super.toJson(),
      Name: this.Name,
      EntityType: this.EntityType,
    };
    if (
      Array.isArray(this.NavigationPropertyBinding) &&
      this.NavigationPropertyBinding.length > 0
    ) {
      json['NavigationPropertyBinding'] = this.NavigationPropertyBinding.map((n) => n.toJson());
    }
    if (this.IncludeInServiceDocument !== undefined) {
      json['IncludeInServiceDocument'] = this.IncludeInServiceDocument;
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

  override toConfig(): ODataEntitySetConfig {
    return {
      ...super.toConfig(),
      name: this.Name,
      entityType: this.EntityType,
      service: {},
    } as ODataEntitySetConfig;
  }
}
