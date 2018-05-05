import { CsdlEntitySet } from './csdl-entity-set';
import { CsdlSingleton } from './csdl-singleton';
import { CsdlFunctionImport, CsdlActionImport } from './csdl-function-action';

export class CsdlEntityContainer {
    constructor(
        public name: string,
        public extend?: string,
        public entitySets?: CsdlEntitySet[],
        public singletons?: CsdlSingleton[],
        public functionImports?: CsdlFunctionImport[],
        public actionImports?: CsdlActionImport[]
    ) { }
}
