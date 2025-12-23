export class Import {
  public names: string[] = [];
  public aliases: string[] = [];
  public from: string;
  public constructor(names: string[], aliases: string[], from: string) {
    this.names = names;
    this.aliases = aliases;
    this.from = from;
  }

  public path(): string {
    let path = this.from.toString();
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
