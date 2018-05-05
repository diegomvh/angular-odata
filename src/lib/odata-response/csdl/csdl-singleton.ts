import { CsdlNavigationPropertyBinding } from './csdl-navigation-property-binding';

export class CsdlSingleton {
    constructor(
        public name: string,
        public type: string,
        public navigationPropertyBindings?: CsdlNavigationPropertyBinding[]
    ) { }
}
