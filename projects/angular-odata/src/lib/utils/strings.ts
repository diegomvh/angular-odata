// From https://github.com/adamhalasz/uniqid
var glast: number;
function now() {
  let time = Date.now();
  let last = glast || time;
  return (glast = time > last ? time : last + 1);
}
export const Strings = {
  uniqueId(prefix?: string, suffix?: string): string {
    return (prefix ? prefix : '') + now().toString(36) + (suffix ? suffix : '');
  },
};
