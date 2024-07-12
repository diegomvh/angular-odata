import { strings } from '@angular-devkit/core';
import { Base } from "./base";
import { Import } from "./import";
import { CsdlEntityContainer } from '../metadata/csdl/csdl-entity-container';
import { CsdlSingleton } from '../metadata/csdl/csdl-singleton';
import { CsdlEntitySet } from '../metadata/csdl/csdl-entity-set';
import { url, Source } from '@angular-devkit/schematics';
import { Schema as ApiGenSchema } from '../schema';

export class Service extends Base 
{
    constructor(options: ApiGenSchema, protected edmType: CsdlEntitySet | CsdlEntityContainer | CsdlSingleton) { 
        super(options);
    }
    public override template(): Source {
        return this.edmType instanceof CsdlEntitySet ? url("./files/entityset-service") :
            this.edmType instanceof CsdlSingleton ? url("./files/singleton-service") :
            url("./files/entitycontainer-service");
    }
    public override variables(): { [name: string]: any; } {
        return {
            type: this.edmType instanceof CsdlEntitySet ? this.edmType.EntityType : 
                this.edmType instanceof CsdlSingleton ? this.edmType.Type : 
                this.options.name,
        };
    }
    public override name() {
        return strings.classify(this.edmType.name()) + "Service";
    } 
    public override fileName() {
        return strings.dasherize(this.edmType.name()) + ".service";
    } 
    public override directory() {
        return this.edmType.namespace().replace(/\./g, "/");
    } 
    public override fullName() {
        return this.edmType.fullName();
    } 
    public override importTypes(): string[] {
        const imports = [];
        if (this.edmType instanceof CsdlEntitySet) {
            imports.push(this.edmType.EntityType);
        } else if (this.edmType instanceof CsdlSingleton) {
            imports.push(this.edmType.Type);
        }
        return imports;
    }
}