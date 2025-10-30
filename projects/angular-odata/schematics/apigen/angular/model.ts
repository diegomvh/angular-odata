import { strings } from '@angular-devkit/core';
import { Base } from './base';
import { CsdlComplexType, CsdlEntityType } from '../metadata/csdl/csdl-structured-type';
import { url, Source } from '@angular-devkit/schematics';
import { Schema as ApiGenSchema } from '../schema';
import { CsdlNavigationProperty, CsdlProperty } from '../metadata/csdl/csdl-structural-property';
import { toTypescriptType } from '../utils';
import { Entity } from './entity';
import { Package } from './package';
import { CsdlNavigationPropertyBinding } from '../metadata/csdl/csdl-navigation-property-binding';

export class ModelField {
  constructor(
    protected model: Model,
    protected edmType: CsdlProperty | CsdlNavigationProperty,
  ) {}

  name() {
    const required = !(this.edmType instanceof CsdlNavigationProperty || this.edmType.Nullable);
    const name = this.edmType.Name;
    return name + (!required ? '?' : '');
  }

  type() {
    const pkg = this.model.getPackage();
    const enumType = pkg.findEnum(this.edmType.Type);
    const entityType = pkg.findEntity(this.edmType.Type);
    let type = 'any';
    if (enumType !== undefined) {
      type = enumType.importedName!;
      type += this.edmType.Collection ? '[]' : '';
    } else if (entityType !== undefined) {
      if (this.edmType.Collection) {
        const collection = pkg.findCollection(this.edmType.Type);
        const model = pkg.findModel(this.edmType.Type);
        type = `${collection!.importedName}<${entityType!.importedName}, ${model!.importedName}<${entityType!.importedName}>>`;
      } else {
        const model = pkg.findModel(this.edmType.Type);
        type = `${model!.importedName}<${entityType!.importedName}>`;
      }
    } else {
      type = toTypescriptType(this.edmType.Type);
      type += this.edmType.Collection ? '[]' : '';
    }
    if (this.edmType.Nullable && !this.edmType.Collection) {
      type += ' | null';
    }
    return type;
  }

  resource() {
    const pkg = this.model.getPackage();
    const resourceName = `$$${this.edmType.Name}`;
    if (this.edmType instanceof CsdlNavigationProperty) {
      const entity = pkg.findEntity(this.edmType.Type);
      return `public ${resourceName}() {
    return this.navigationProperty<${entity?.importedName}>('${this.edmType.Name}');
  }
  `;
    } else {
      return `public ${resourceName}() {
    return this.property<${this.type()}>('${this.edmType.Name}');
  }
  `;
    }
  }

  getter() {
    const pkg = this.model.getPackage();
    const getterName = `$${this.edmType.Name}`;
    if (this.edmType instanceof CsdlNavigationProperty) {
      const entity = pkg.findEntity(this.edmType.Type);
      return `public ${getterName}() {
    return this.getAttribute<${entity?.importedName}>('${this.edmType.Name}') as ${entity?.importedName};
  }
  `;
    } else {
      return `public ${getterName}() {
    return this.getAttribute<${this.type()}>('${this.edmType.Name}') as ${this.type()};
  }
  `;
    }
  }

  setter() {
    const pkg = this.model.getPackage();
    const setterName = `${this.edmType.Name}$$`;
    if (this.edmType instanceof CsdlNavigationProperty) {
      const entity = pkg.findEntity(this.edmType.Type);
      return `public ${setterName}(model: ${this.type()} | null, options?: ODataOptions) {
    return this.setReference<${entity?.importedName}>('${this.edmType.Name}', model, options);
  }
  `;
    } else {
      return `
  `;
    }
  }

  fetch() {
    const pkg = this.model.getPackage();
    const fetchName = `${this.edmType.Name}$`;
    if (this.edmType instanceof CsdlNavigationProperty) {
      const entity = pkg.findEntity(this.edmType.Type);
      return `public ${fetchName}(options?: ODataQueryArgumentsOptions<${entity?.importedName}>) {
    return this.fetchAttribute<${entity?.importedName}>('${this.edmType.Name}', options) as Observable<${entity?.importedName}>;
  }
`;
    } else {
      return `public ${fetchName}(options?: ODataQueryArgumentsOptions<${this.type()}>) {
    return this.fetchAttribute<${this.type()}>('${this.edmType.Name}', options) as Observable<${this.type()}>;
  }
`;
    }
  }

  isGeoSpatial(): boolean {
    return (
      this.edmType.Type.startsWith('Edm.Geography') || this.edmType.Type.startsWith('Edm.Geometry')
    );
  }
}

export class Model extends Base {
  constructor(
    pkg: Package,
    options: ApiGenSchema,
    protected edmType: CsdlEntityType | CsdlComplexType,
    protected entity: Entity,
  ) {
    super(pkg, options);
  }

  public entityType() {
    return this.edmType.fullName();
  }

  public override template(): Source {
    return url('./files/model');
  }
  public override variables(): { [name: string]: any } {
    return {
      type: this.name() + 'Model',
      baseType: this.edmType.BaseType ? this.edmType.BaseType + 'Model' : null,
      entity: this.entity,
      fields: this.fields(),
      hasGeoFields: this.hasGeoFields(),
      geoFields: this.geoFields(),
      callables: this.callables ?? [],
      navigations: this.navitations(),
    };
  }
  public override name() {
    return strings.classify(this.edmType.name()) + 'Model';
  }
  public override fileName() {
    return strings.dasherize(this.edmType.name()) + '.model';
  }
  public override directory() {
    return this.edmType.namespace().replace(/\./g, '/');
  }
  public override fullName() {
    return this.edmType.fullName() + 'Model';
  }
  public override importTypes(): string[] {
    const pkg = this.getPackage();
    const imports = [this.entity.fullName()];
    if (this.edmType.BaseType) {
      imports.push(this.edmType.BaseType);
      imports.push(this.edmType.BaseType + 'Model');
    }
    for (let prop of this.edmType?.Property ?? []) {
      if (!prop.Type.startsWith('Edm.')) {
        imports.push(prop.Type);
        imports.push(prop.Type + 'Model');
        if (prop.Collection) {
          imports.push(prop.Type + 'Collection');
        }
      }
    }
    for (let prop of this.edmType?.NavigationProperty ?? []) {
      if (!prop.Type.startsWith('Edm.')) {
        imports.push(prop.Type);
        imports.push(prop.Type + 'Model');
        if (prop.Collection) {
          imports.push(prop.Type + 'Collection');
        }
      }
    }
    for (let callable of this.callables ?? []) {
      imports.push(...callable.importTypes());
    }
    const service = pkg.findEntitySet(this.edmType.fullName());
    if (service) {
      imports.push(...(service.NavigationPropertyBinding ?? []).map((b) => b.entityType()));
      imports.push(
        ...(service.NavigationPropertyBinding ?? [])
          .map((b) => b.resolvePropertyType((fullName: string) => pkg.findEntityType(fullName)))
          .filter((e) => e)
          .map((e) => e!.fullName()),
      );
      imports.push(
        ...(service.NavigationPropertyBinding ?? [])
          .map((b) =>
            b.resolveNavigationPropertyType((fullName: string) => pkg.findEntityType(fullName)),
          )
          .filter((e) => e)
          .map((e) => e!.Type),
      );
    }
    return imports;
  }

  public navitations(): string[] {
    const pkg = this.getPackage();
    const service = pkg.findEntitySet(this.edmType.fullName());
    if (service) {
      const navigations: string[] = [];
      let properties: CsdlNavigationProperty[] = [];
      let entity: CsdlEntityType | CsdlComplexType | undefined = this.edmType;
      while (entity) {
        properties = [...properties, ...(this.edmType.NavigationProperty ?? [])];
        if (!entity.BaseType) {
          break;
        }
        entity = this.getPackage().findEntityType(entity.BaseType);
      }
      let bindings = service.NavigationPropertyBinding?.filter((binding) =>
        properties.every((p) => {
          const nav = binding.resolveNavigationPropertyType((fullName: string) =>
            pkg.findEntityType(fullName),
          );
          return p.Name !== nav?.Name;
        }),
      );
      return this.renderNavigationPropertyBindings(bindings);
    }
    return [];
  }

  renderNavigationPropertyBindings(
    bindings: CsdlNavigationPropertyBinding[] | undefined,
  ): string[] {
    const pkg = this.getPackage();
    let result: string[] = [];
    let casts: string[] = [];
    for (let binding of bindings ?? []) {
      const nav = binding.resolveNavigationPropertyType((fullName: string) =>
        pkg.findEntityType(fullName),
      );
      const isCollection = nav ? nav.Collection : false;
      const navEntity = nav ? pkg.findEntityType(nav.Type) : undefined;
      const bindingEntity = pkg.findEntityType(binding.entityType());
      const propertyEntity = binding.resolvePropertyType((fullName: string) =>
        pkg.findEntityType(fullName),
      );

      const entity = pkg.findEntity(navEntity?.fullName() || '');
      if (propertyEntity && bindingEntity && false) {
      } else {
        const returnType = isCollection
          ? `ODataCollection<${entity?.importedName}, ODataModel<${entity?.importedName}>>`
          : `ODataModel<${entity?.importedName}>`;
        var responseType = isCollection ? 'collection' : 'model';
        var methodName =
          `as${propertyEntity?.Name}` +
          nav?.Name.substring(0, 1).toUpperCase() +
          nav?.Name.substring(1);
        var castEntity = pkg.findEntity(propertyEntity?.fullName() || '');

        // Navigation
        result.push(`public ${methodName}(options?: ODataQueryArgumentsOptions<${entity?.importedName}>) {
    return this.fetchNavigationProperty<${entity?.importedName}>('${binding.Path}', '${responseType}', options) as Observable<${returnType}>;
  }`);
      }
    }
    return result;
  }
  public fields(): ModelField[] {
    return [
      ...(this.edmType.Property ?? []).map((p) => new ModelField(this, p)),
      ...(this.edmType.NavigationProperty ?? []).map((p) => new ModelField(this, p)),
    ];
  }
  public geoFields(): ModelField[] {
    return this.fields().filter((p) => p.isGeoSpatial());
  }
  public hasGeoFields(): boolean {
    return this.geoFields().length > 0;
  }
}
