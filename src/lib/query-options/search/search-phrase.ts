import { SearchSimple } from './search-simple';

export class SearchPhrase extends SearchSimple {
    toString(): string {
        return `"${this.value}"`;
    }
}
