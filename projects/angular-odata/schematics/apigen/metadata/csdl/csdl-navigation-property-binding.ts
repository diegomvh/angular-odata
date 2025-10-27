import { find } from "rxjs";
import { CsdlEntitySet } from "./csdl-entity-set";
import { CsdlSingleton } from "./csdl-singleton";
import { CsdlEntityType } from "./csdl-structured-type";

export class CsdlNavigationPropertyBinding {
  Path: string;
  Target: string;

  constructor(protected entitySet: CsdlEntitySet | CsdlSingleton, { Path, Target }: { Path: string; Target: string }) {
    this.Path = Path;
    this.Target = Target;
  }

  toJson() {
    return {
      Path: this.Path,
      Target: this.Target,
    };
  }

  entityType() {
    return this.entitySet instanceof CsdlEntitySet ? this.entitySet.EntityType : this.entitySet.Type;
  }

  resolvePropertyName() {
    return this.Path.split('/').pop();
  }

  resolvePropertyType(findEntityType: (fullName: string) => CsdlEntityType | undefined) {
    const parts = this.Path.split('/');
    let entityType = findEntityType(this.entityType());
    if (parts.length > 1) {
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        const baseEntity = findEntityType(part);
        if (baseEntity) {
          entityType = baseEntity;
        } else {
          const navProp = entityType?.findNavigationPropertyType(part, findEntityType);
          entityType = navProp ? findEntityType(navProp.Type) : undefined;
        }
      }
    }
    return entityType;
  }

  resolveNavigationPropertyType(findEntityType: (fullName: string) => CsdlEntityType | undefined) {
    const name = this.Path.split('/').pop();
    let entity = this.resolvePropertyType(findEntityType);
    if (entity && name) {
      return entity.findNavigationPropertyType(name, findEntityType);
    }
  }
}
