import { strings } from '@angular-devkit/core';
import { Base } from './base';
import { CsdlComplexType, CsdlEntityType } from '../metadata/csdl/csdl-structured-type';
import { url, Source } from '@angular-devkit/schematics';
import { Schema as ApiGenSchema } from '../schema';
import { CsdlNavigationProperty, CsdlProperty } from '../metadata/csdl/csdl-structural-property';
import { toTypescriptType } from '../utils';

export class EntityProperty {
  constructor(protected edmType: CsdlProperty | CsdlNavigationProperty) {}

  name() {
    return this.edmType.Name;
  }

  type() {
    let type = toTypescriptType(this.edmType.Type);
    type += this.edmType.Collection ? '[]' : '';
    type += this.edmType.Nullable ? ' | null' : '';
    return type;
  }
}

export class Entity extends Base {
  constructor(
    options: ApiGenSchema,
    protected edmType: CsdlEntityType | CsdlComplexType,
  ) {
    super(options);
  }

  public override template(): Source {
    return url('./files/entity');
  }
  public override variables(): { [name: string]: any } {
    return {
      type: this.name() + (this.edmType instanceof CsdlEntityType ? 'EntityType' : 'ComplexType'),
      baseType: this.edmType.BaseType,
      properties: [
        ...(this.edmType.Property ?? []).map((p) => new EntityProperty(p)),
        ...(this.edmType.NavigationProperty ?? []).map((p) => new EntityProperty(p)),
      ],
    };
  }
  public override name() {
    return strings.classify(this.edmType.name());
  }
  public override fileName() {
    return (
      strings.dasherize(this.edmType.name()) +
      (this.edmType instanceof CsdlEntityType ? '.entity' : '.complex')
    );
  }
  public override directory() {
    return this.edmType.namespace().replace(/\./g, '/');
  }
  public override fullName() {
    return this.edmType.fullName();
  }
  public override importTypes(): string[] {
    const imports = [];
    if (this.edmType.BaseType) {
      imports.push(this.edmType.BaseType);
    }
    for (let prop of this.edmType?.Property ?? []) {
      if (!prop.Type.startsWith('Edm.')) {
        imports.push(prop.Type);
      }
    }
    for (let prop of this.edmType?.NavigationProperty ?? []) {
      if (!prop.Type.startsWith('Edm.')) {
        imports.push(prop.Type);
      }
    }
    return imports;
  }
}
