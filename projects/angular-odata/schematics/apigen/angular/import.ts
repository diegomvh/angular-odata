export class Import {
  public names: string[] = [];
  public aliases: string[] = [];
  public absPath: string;
  public relPath: string;
  public constructor(names: string[], aliases: string[], absPath: string, relPath: string) {
    this.names = names;
    this.aliases = aliases;
    this.absPath = absPath;
    this.relPath = relPath;
  }

  public path(): string {
    let path = this.relPath.toString();
    if (!path.startsWith('../')) path = `./${path}`;
    return path;
  }

  public resolve(): string[] {
    let names = [];
    for (let i = 0; i < this.names.length; i++) {
      if (this.names[i] !== this.aliases[i]) {
        names.push(`${this.names[i]} as ${this.aliases[i]}`);
      } else {
        names.push(this.names[i]);
      }
    }
    return names;
  }
}
