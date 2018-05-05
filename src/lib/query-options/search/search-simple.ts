import { Utils } from '../../utils/utils';
import { Search } from './search';

export class SearchSimple extends Search {
    constructor(protected value: string) {
        super();
        Utils.requireNotNullNorUndefined(value, 'value');
        Utils.requireNotEmpty(value, 'value');
    }

    toString(): string {
        return this.value;
    }

    isEmpty(): boolean {
        return Utils.isNullOrUndefined(this.value) || !this.value.length;
    }
}
