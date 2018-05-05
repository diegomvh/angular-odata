import { Filter } from './filter';

export abstract class FilterHasFilter {
    protected filter: Filter | Filter[];

    constructor(filter: Filter | Filter[]) {
        this.filter = filter;
    }

    getFilter(): Filter | Filter[] {
        return this.filter;
    }
}
