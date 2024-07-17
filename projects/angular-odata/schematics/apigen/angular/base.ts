import { strings } from '@angular-devkit/core';
import { getRandomName } from "../../random"
import { Import } from "./import";
import { url, Source } from '@angular-devkit/schematics';
import { Schema as ApiGenSchema } from '../schema';
import { BINDING_PARAMETER_NAME, CsdlAction, CsdlCallable, CsdlFunction } from "../metadata/csdl/csdl-function-action";
import { toTypescriptType } from "../utils";

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

  returnType() {
    return this.callable.ReturnType;
  }

  fullName() {
    return this.callable.fullName();
  } 

  resourceFunction() {
    const isFunction = this.callable instanceof CsdlFunction;
    const methodName = strings.camelize(this.callable.Name);
    const bindingParameter = this.bindingParameter();
    const bindingType = bindingParameter !== undefined ? toTypescriptType(bindingParameter.Type) : '';
    const returnType = this.returnType();
    const retType = returnType === undefined ? 'null' : toTypescriptType(returnType.Type);
    const bindingMethod = !bindingParameter?.Collection ? 'entity' : 'entities';
    const baseMethod = isFunction ? 'function' : 'action';
    const keyParameter = !bindingParameter?.Collection ? `key: EntityKey<${bindingType}>` : '';
    const key = !bindingParameter?.Collection ? `key` : '';
    return `public ${methodName}(${keyParameter}) {
    return this.${bindingMethod}(${key}).${baseMethod}<, ${retType}>('${this.fullName()}');
  }`;
  }
  callableFunction() {
    const isFunction = this.callable instanceof CsdlFunction;
    const methodResourceName = strings.camelize(this.callable.Name);
    const methodName = strings.classify(this.callable.Name);
    const bindingParameter = this.bindingParameter();
    const returnType = this.returnType();
    const responseType = returnType === undefined ? 'none' : 
      returnType?.Collection ? 'entities' : 
      returnType?.Type.startsWith("Edm.") ? 'property' : 
      'entity';
    const retType = returnType === undefined ? 'null' : toTypescriptType(returnType.Type);
    const bindingType = bindingParameter !== undefined ? toTypescriptType(bindingParameter.Type) : '';
    const baseMethod = isFunction ? 'callFunction' : 'callAction';
    const optionsType = isFunction ? 'ODataFunctionOptions' : 'ODataActionOptions';
    return `public call${methodName}(key: EntityKey<${bindingType}>, options?: ${optionsType}<${retType}>) {
    return this.${baseMethod}<, ${retType}>({}, this.${methodResourceName}(key), '${responseType}', options);
  }`;
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


  protected callables: Callable[] = [];
  public addCallable(callable: Callable) {
    this.callables.push(callable);
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