export const Urls = {
  escapeIllegalChars(string: string) {
    string = string.replace(/%/g, '%25');
    string = string.replace(/\+/g, '%2B');
    string = string.replace(/\//g, '%2F');
    string = string.replace(/\?/g, '%3F');
    string = string.replace(/#/g, '%23');
    string = string.replace(/&/g, '%26');
    string = string.replace(/'/g, "''");
    return string;
  }
}