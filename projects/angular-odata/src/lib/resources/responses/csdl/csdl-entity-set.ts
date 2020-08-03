import { CsdlNavigationPropertyBinding } from './csdl-navigation-property-binding';

export class CsdlEntitySet {
    constructor(
        public name: string,
        public entityType: string,
        public navigationPropertyBinding?: CsdlNavigationPropertyBinding[],
        public includeInServiceDocument?: boolean
    ) {

    }
}
