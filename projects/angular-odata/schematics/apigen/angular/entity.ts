import { strings } from '@angular-devkit/core';
import { Base } from './base';
import { CsdlComplexType, CsdlEntityType } from '../metadata/csdl/csdl-structured-type';
import { url, Source } from '@angular-devkit/schematics';
import { Schema as ApiGenSchema } from '../schema';
import { CsdlNavigationProperty, CsdlProperty } from '../metadata/csdl/csdl-structural-property';
import { toTypescriptType } from '../utils';
import { Package } from './package';
import { Import } from './import';

export class EntityProperty {
  constructor(
    protected entity: Entity,
    protected edmType: CsdlProperty | CsdlNavigationProperty,
  ) {}

  name() {
    const required = !(this.edmType instanceof CsdlNavigationProperty || this.edmType.Nullable);
    const name = this.edmType.Name;
    return name + (!required ? '?' : '');
  }

  type(imports: Import[]) {
    const pkg = this.entity.getPackage();
    const enumType = pkg.findEnum(this.edmType.Type);
    const entityType = pkg.findEntity(this.edmType.Type);
    let type = 'any';
    if (enumType !== undefined) {
      type = enumType.importedName(imports)!;
      type += this.edmType.Collection ? '[]' : '';
    } else if (entityType !== undefined) {
      type = entityType.importedName(imports)!;
      type += this.edmType.Collection ? '[]' : '';
    } else {
      type = toTypescriptType(this.edmType.Type);
      type += this.edmType.Collection ? '[]' : '';
    }
    return type;
  }

  isGeoSpatial(): boolean {
    return (
      this.edmType.Type.startsWith('Edm.Geography') || this.edmType.Type.startsWith('Edm.Geometry')
    );
  }

  isDuration(): boolean {
    return this.edmType.Type.startsWith('Edm.Duration');
  }
}

export class Entity extends Base {
  constructor(
    pkg: Package,
    options: ApiGenSchema,
    protected edmType: CsdlEntityType | CsdlComplexType,
  ) {
    super(pkg, options);
  }

  public override template(): Source {
    return url('./files/entity');
  }
  public override variables(imports: Import[]): { [name: string]: any } {
    return {
      type: this.name() + (this.edmType instanceof CsdlEntityType ? 'EntityType' : 'ComplexType'),
      baseType: this.edmType.BaseType,
      properties: this.properties(),
      hasGeoProperties: this.hasGeoProperties(),
      hasDurationProperties: this.hasDurationProperties(),
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
      if (!prop.isEdmType()) {
        imports.push(prop.Type);
      }
    }
    for (let prop of this.edmType?.NavigationProperty ?? []) {
      if (!prop.isEdmType()) {
        imports.push(prop.Type);
      }
    }
    return imports;
  }
  public properties(): EntityProperty[] {
    return [
      ...(this.edmType.Property ?? []).map((p) => new EntityProperty(this, p)),
      ...(this.edmType.NavigationProperty ?? []).map((p) => new EntityProperty(this, p)),
    ];
  }

  public geoProperties(): EntityProperty[] {
    return this.properties().filter((p) => p.isGeoSpatial());
  }
  public hasGeoProperties(): boolean {
    return this.geoProperties().length > 0;
  }

  public durationProperties() {
    return this.properties().filter((p) => p.isDuration());
  }

  public hasDurationProperties(): boolean {
    return this.durationProperties().length > 0;
  }
}
