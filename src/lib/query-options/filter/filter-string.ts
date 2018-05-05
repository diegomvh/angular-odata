import { Utils } from '../../utils/utils';
import { Filter } from './filter';

export class FilterString implements Filter {
    private filter: string;

    constructor(filter: string) {
        Utils.requireNotNullNorUndefined(filter, 'filter');
        Utils.requireNotEmpty(filter, 'filter');
        this.filter = filter;
    }

    toString(): string {
        return this.filter;
    }

    isEmpty(): boolean {
        return Utils.isNullOrUndefined(this.filter) || !this.filter.length;
    }
}
