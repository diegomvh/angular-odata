type JsonSchemaSelect<T> = Array<keyof T>;
type JsonSchemaOrder<T> = Array<keyof T>;
type JsonSchemaExpand<T> = {[P in keyof T]?: JsonSchemaConfig<T[P]> };

export type JsonSchemaExpandOptions<T> = {
  select?: JsonSchemaSelect<T>;
  order?: JsonSchemaOrder<T>;
  expand?: JsonSchemaExpand<T>;
}

export type JsonSchemaConfig<T> = JsonSchemaExpandOptions<T>; 

export interface Parser<T> {
  type: string;
  parse(value: any): T;
  toJSON(value: T | Partial<T>): any;
  toJsonSchema(config: JsonSchemaConfig<T>);
  parserFor<E>(name: string): Parser<E>;
  resolveKey(attrs: any);
}

export const PARSERS: {[name: string]: Parser<any>} = {
  'Date': <Parser<Date>>{
    type: 'Date',
    parse(value: any) {
      return Array.isArray(value) ?
        value.map(v => new Date(v)) :
        new Date(value);
    },
    toJSON(value: Date) { 
      return Array.isArray(value) ?
        value.map(v => new Date(v)) :
        new Date(value);
    },
    parserFor<E>(name: string) { },
    resolveKey(attrs: any) {}
  },
};