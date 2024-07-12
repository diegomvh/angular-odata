
export class Import {
    public names: string[] = []
    public from: string
    public constructor(names: string[], from: string) {
        this.names = names;
        this.from = from;
    }

    public path(): string {
        var path = this.from.toString();
        if (!path.startsWith("../"))
            path = `./${path}`;
        return path;
    }
}