import { PARAM_SEPARATOR, VALUE_SEPARATOR } from '../constants';

export const Urls = {
  parseQueryString(query: string) {
    return query.split(PARAM_SEPARATOR).reduce((acc, param: string) => {
      let index = param.indexOf(VALUE_SEPARATOR);
      if (index !== -1)
        Object.assign(acc, {
          [param.substr(0, index)]: param.substr(index + 1),
        });
      return acc;
    }, {});
  },
  escapeIllegalChars(string: string) {
    string = string.replace(/%/g, '%25');
    string = string.replace(/\+/g, '%2B');
    string = string.replace(/\//g, '%2F');
    string = string.replace(/\?/g, '%3F');
    string = string.replace(/#/g, '%23');
    string = string.replace(/&/g, '%26');
    string = string.replace(/'/g, "''");
    return string;
  },
};
