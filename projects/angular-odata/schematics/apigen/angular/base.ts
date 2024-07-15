import { getRandomName } from "../../random"
import { Import } from "./import";
import { url, Source } from '@angular-devkit/schematics';
import { Schema as ApiGenSchema } from '../schema';
import { BINDING_PARAMETER_NAME, CsdlCallable } from "../metadata/csdl/csdl-function-action";

const makeRelativePath = (from: string, to: string) => {
  if (from === '') { return to; }
  if (to.startsWith(from)) { return to.substring(from.length + 1); }
  let shared = from;
  let i = 0;
  while (shared.length > 0 && !to.startsWith(shared)) {
    shared = shared.substring(0, shared.lastIndexOf('/'));
    i++;
  }
  return Array.from({ length: i }).fill('..').join('/') + "/" + to.substring(shared.length + 1);
}

export class Callable {
  constructor(protected callable: CsdlCallable) { }

  name() {
    return this.callable.Name;
  }

  isBound() {
    return this.callable.IsBound;
  }
  bindingParameter() {
    return this.callable.Parameter?.find(p => p.Name === BINDING_PARAMETER_NAME);
  }
}

export abstract class Base {
  constructor(protected options: ApiGenSchema) { }

  public abstract name(): string;
  public abstract fileName(): string;
  public abstract fullName(): string;
  public abstract directory(): string;

  public abstract importTypes(): string[];
  public abstract template(): Source;
  public abstract variables(): { [name: string]: any };

  public path(): string {
    const directory = this.directory();
    const filename = this.fileName();
    return directory !== '' ? directory + `/${filename}` : filename;
  };

  public imports(): Import[] {
    const groups = this.dependencies
      .filter(a => a[1].path() != this.path())
      .reduce((acc, i) => {
        const path = makeRelativePath(this.directory(), i[1].path());
        if (acc[path] === undefined) {
          acc[path] = [];
        }
        acc[path].push(i);
        return acc;
      }, {} as { [path: string]: [string, Base][] });
    return Object.entries(groups).map(([path, items]) => {
      const names = items.reduce((acc, i) => [...acc, i[0]], [] as string[]);
      return new Import(names, path);
    });
  }

  public importedName?: string;
  public cleanImportedNames() {
    this.dependencies.forEach(d => d[1].importedName = d[1].name());
  }
  protected dependencies: [string, Base][] = [];
  public addDependency(renderable: Base) {
    if (this.dependencies.every(d => d[1] != renderable)) {
      var alias = renderable.name()!;
      while (this.dependencies.some(d => d[0] == alias)) {
        alias = getRandomName();
      }
      this.dependencies.push([alias, renderable]);
    }
  }

  public addDependencies(renderables: Base[]) {
    renderables.forEach(r => this.addDependency(r));
  }


  protected callables: [string, Callable][] = [];
  public addCallable(callable: Callable) {
    if (this.callables.every(d => d[1] != callable)) {
      var alias = callable.name()!;
      while (this.callables.some(d => d[0] == alias)) {
        alias = getRandomName();
      }
      this.callables.push([alias, callable]);
    }
  }

  public addCallables(callables: Callable[]) {
    callables.forEach(r => this.addCallable(r));
  }
}

export class Index extends Base {
  constructor(options: ApiGenSchema) {
    super(options);
  }
  public override template(): Source {
    return url("./files/index");
  }
  public override variables(): { [name: string]: any; } {
    return { ...this.options, };
  }
  public override name() {
    return "";
  }
  public override fileName() {
    return "index";
  }
  public override directory() {
    return '';
  }
  public override fullName() {
    return this.name();
  }
  public override importTypes(): string[] {
    return [];
  }
}