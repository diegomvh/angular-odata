// From https://github.com/adamhalasz/uniqid
var glast: number;
function now() {
  let time = Date.now();
  let last = glast || time;
  return (glast = time > last ? time : last + 1);
}
export const Strings = {
  uniqueId({
    prefix,
    suffix,
  }: { prefix?: string; suffix?: string } = {}): string {
    return (prefix ? prefix : '') + now().toString(36) + (suffix ? suffix : '');
  },

  titleCase(text: string): string {
    const result = text.replace(/([a-z])([A-Z])/g, '$1 $2');
    return result
      .split(' ')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  },
};
