import { Utils } from '../../utils/utils';

export abstract class FilterHasProperty {
    protected property: string;

    constructor(property: string) {
        this.setProperty(property);
    }

    setProperty(property: string): void {
        Utils.requireNotNullNorUndefined(property, 'property');
        this.property = property;
    }

    getProperty(): string {
        return this.property;
    }
}
