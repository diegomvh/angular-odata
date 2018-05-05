import { Utils } from '../../utils/utils';
import { Filter } from './filter';
import { FilterHasFilter } from './filter-has-filter';
import { FilterHasProperty } from './filter-has-property';

export enum LambdaOperator {
    ANY, ALL
}

export enum LambdaCollection {
    PROPERTY_COLLECTION, ENTITY_SET
}

export class FilterLambda extends FilterHasFilter implements Filter {
    private lambdaCollection: LambdaCollection;
    private propertyOrEntitySet: string;
    private lambdaOperator: LambdaOperator;

    constructor(lambdaCollection: LambdaCollection, propertyOrEntitySet: string, lambdaOperator: LambdaOperator, filter: Filter) {
        super(filter);
        Utils.requireNotNullNorUndefined(lambdaCollection, 'lambdaCollection');
        Utils.requireNotNullNorUndefined(propertyOrEntitySet, 'propertyOrEntitySet');
        Utils.requireNotNullNorUndefined(lambdaOperator, 'lambdaOperator');
        Utils.requireNotNullNorUndefined(filter, 'filter');
        if (lambdaCollection === LambdaCollection.PROPERTY_COLLECTION) {
            this.checkProperty(propertyOrEntitySet, filter);
        }
        this.lambdaCollection = lambdaCollection;
        this.propertyOrEntitySet = propertyOrEntitySet;
        this.lambdaOperator = lambdaOperator;
    }

    toString(): string {
        switch (this.lambdaCollection) {
            case LambdaCollection.PROPERTY_COLLECTION:
                this.replaceProperty(this.filter);
                return `${this.propertyOrEntitySet}/${LambdaOperator[this.lambdaOperator].toLowerCase()}(x:${this.filter.toString()})`;
            case LambdaCollection.ENTITY_SET:
                return `${this.propertyOrEntitySet}/${LambdaOperator[this.lambdaOperator].toLowerCase()}(x:x/${this.filter.toString()})`;
            default:
                throw new Error('unknown lambdaCollection: ' + this.lambdaCollection);
        }
    }

    isEmpty(): boolean {
        if (Utils.isNullOrUndefined(this.lambdaCollection)
            && Utils.isNullOrUndefined(this.propertyOrEntitySet)
            && Utils.isNullOrUndefined(this.lambdaOperator)
            && Utils.isNullOrUndefined(this.filter)) {
            return true;
        }
        if (Utils.isNullOrUndefined(this.propertyOrEntitySet)
            && Utils.isNotNullNorUndefined(this.filter) && Utils.isEmpty(this.filter)) {
            return true;
        }
        if (Utils.isNullOrUndefined(this.filter)
            && Utils.isNotNullNorUndefined(this.propertyOrEntitySet) && !this.propertyOrEntitySet.length) {
            return true;
        }
        if (Utils.isNotNullNorUndefined(this.propertyOrEntitySet) && !this.propertyOrEntitySet.length
            && Utils.isNotNullNorUndefined(this.filter) && Utils.isEmpty(this.filter)) {
            return true;
        }

        return false;
    }

    protected checkProperty(propertyOrEntitySet: string, filter: Filter | Filter[]) {
        if (Utils.isNullOrUndefined(filter)) {
            return;
        }
        if (filter instanceof FilterHasProperty) {
            if (propertyOrEntitySet !== filter.getProperty()) {
                throw new Error('lambda property to filter must match inner filters property');
            }
        }
        if (filter instanceof FilterHasFilter) {
            const filterChild: Filter | Filter[] = filter.getFilter();
            if (filterChild instanceof Filter) {
                this.replaceProperty(filterChild);
            } else {
                for (const f of filterChild) {
                    this.replaceProperty(f);
                }
            }
        }
    }

    protected replaceProperty(filter: Filter | Filter[]) {
        if (Utils.isNullOrUndefined(filter)) {
            return;
        }
        if (filter instanceof FilterHasProperty) {
            filter.setProperty('x');
        }
        if (filter instanceof FilterHasFilter) {
            const filterChild: Filter | Filter[] = filter.getFilter();
            if (filterChild instanceof Filter) {
                this.replaceProperty(filterChild);
            } else {
                for (const f of filterChild) {
                    this.replaceProperty(f);
                }
            }
        }
    }
}
