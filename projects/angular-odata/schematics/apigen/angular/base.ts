import { strings } from "@angular-devkit/core";
import { getRandomName } from "../../random";
import { Import } from "./import";
import { url, Source } from "@angular-devkit/schematics";
import { Schema as ApiGenSchema } from "../schema";
import {
  BINDING_PARAMETER_NAME,
  CsdlCallable,
  CsdlFunction,
  CsdlParameter,
} from "../metadata/csdl/csdl-function-action";
import { makeRelativePath, toTypescriptType } from "../utils";
import { ODataMetadata } from "../metadata";

export class Callable {
  callables: CsdlCallable[] = [];
  constructor(protected callable: CsdlCallable) {
    this.callables.push(callable);
  }

  addOverload(callable: CsdlCallable) {
    this.callables.push(callable);
  }

  name() {
    return this.callable.Name;
  }

  isBound() {
    return this.callable.IsBound ?? false;
  }

  bindingParameter() {
    return this.callable.Parameter?.find(
      (p) => p.Name === BINDING_PARAMETER_NAME,
    );
  }

  parameters() {
    const parameters = this.callables.reduce(
      (acc: CsdlParameter[], c: CsdlCallable) => {
        for (let param of c.Parameter ?? []) {
          if (acc.some((p) => p.Name === param.Name)) continue;
          acc.push(param);
        }
        return acc;
      },
      [] as CsdlParameter[],
    );
    const names = parameters.map((p) => p.Name);
    const binding = parameters.find((p) => p.Name === BINDING_PARAMETER_NAME);
    const inAllCallables = names.filter(
      (n) =>
        n !== BINDING_PARAMETER_NAME &&
        this.callables.every((c) =>
          (c.Parameter ?? []).some((p) => p.Name === n),
        ),
    );
    const required = parameters.filter(
      (p) =>
        p.Name !== BINDING_PARAMETER_NAME && inAllCallables.includes(p.Name),
    );
    const optional = parameters.filter(
      (p) =>
        p.Name !== BINDING_PARAMETER_NAME && !inAllCallables.includes(p.Name),
    );
    return {
      binding,
      required,
      optional,
    };
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
    const { binding, required, optional } = this.parameters();
    const parameters = [...required, ...optional];
    const bindingType =
      binding !== undefined ? toTypescriptType(binding.Type) : "";
    const returnType = this.returnType();
    const retType =
      returnType === undefined ? "null" : toTypescriptType(returnType.Type);
    const bindingMethod = !binding?.Collection ? "entity" : "entities";
    const baseMethod = isFunction ? "function" : "action";
    const keyParameter = !binding?.Collection
      ? `key: EntityKey<${bindingType}>`
      : "";
    const key = !binding?.Collection ? `key` : "";
    const parametersType =
      parameters.length === 0
        ? "null"
        : `{${parameters
            .map((p) => {
              const op = optional.includes(p);
              return `${p.Name}${op ? "?" : ""}: ${toTypescriptType(p.Type)}`;
            })
            .join(", ")}}`;
    return `public ${methodName}(${keyParameter}) {
    return this.${bindingMethod}(${key}).${baseMethod}<${parametersType}, ${retType}>('${this.fullName()}');
  }`;
  }

  callableFunction() {
    const isFunction = this.callable instanceof CsdlFunction;
    const { binding, required, optional } = this.parameters();
    const parameters = [...required, ...optional];
    const returnType = this.returnType();

    const methodResourceName = strings.camelize(this.callable.Name);
    const methodName = strings.classify(this.callable.Name);
    const responseType =
      returnType === undefined
        ? "none"
        : returnType?.Collection
          ? "entities"
          : returnType?.Type.startsWith("Edm.")
            ? "property"
            : "entity";
    const retType =
      returnType === undefined ? "null" : toTypescriptType(returnType.Type);

    const bindingType =
      binding !== undefined ? toTypescriptType(binding.Type) : "";
    const baseMethod = isFunction ? "callFunction" : "callAction";
    const parametersCall =
      parameters.length === 0
        ? "null"
        : `{${parameters.map((p) => p.Name).join(", ")}}`;

    // Method arguments
    let args = !binding?.Collection ? [`key: EntityKey<${bindingType}>`] : [];
    args = [
      ...args,
      ...(required.length === 0
        ? []
        : required.map((p) => `${p.Name}: ${toTypescriptType(p.Type)}`)),
    ];
    args = [
      ...args,
      ...(optional.length === 0
        ? []
        : optional.map((p) => `${p.Name}?: ${toTypescriptType(p.Type)}`)),
    ];
    const optionsType =
      returnType !== undefined && returnType.Type.startsWith("Edm.")
        ? isFunction
          ? "ODataOptions & {alias?: boolean}"
          : "ODataOptions"
        : isFunction
          ? `ODataFunctionOptions<${retType}>`
          : `ODataActionOptions<${retType}>`;
    args.push(`options?: ${optionsType}`);

    // Key parameter
    const key = !binding?.Collection ? `key` : "";

    // Render
    return `public call${methodName}(${args.join(", ")}) {
    return this.${baseMethod}(${parametersCall}, this.${methodResourceName}(${key}), '${responseType}', options);
  }`;
  }
}

export abstract class Base {
  constructor(protected options: ApiGenSchema) {}

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
    return directory !== "" ? directory + `/${filename}` : filename;
  }

  public imports(): Import[] {
    const groups = this.dependencies
      .filter((a) => a[1].path() != this.path())
      .reduce(
        (acc, i) => {
          const path = makeRelativePath(this.directory(), i[1].path());
          if (acc[path] === undefined) {
            acc[path] = [];
          }
          acc[path].push(i);
          return acc;
        },
        {} as { [path: string]: [string, Base][] },
      );
    return Object.entries(groups).map(([path, items]) => {
      const names = items.reduce((acc, i) => [...acc, i[0]], [] as string[]);
      return new Import(names, path);
    });
  }

  public importedName?: string;
  public cleanImportedNames() {
    this.dependencies.forEach((d) => (d[1].importedName = d[1].name()));
  }
  protected dependencies: [string, Base][] = [];
  public addDependency(renderable: Base) {
    if (this.dependencies.every((d) => d[1] != renderable)) {
      var alias = renderable.name()!;
      while (this.dependencies.some((d) => d[0] == alias)) {
        alias = getRandomName();
      }
      this.dependencies.push([alias, renderable]);
    }
  }

  public addDependencies(renderables: Base[]) {
    renderables.forEach((r) => this.addDependency(r));
  }

  protected callables: Callable[] = [];
  public addCallable(callable: Callable) {
    this.callables.push(callable);
  }

  public addCallables(callables: Callable[]) {
    callables.forEach((r) => this.addCallable(r));
  }
}

export class Index extends Base {
  constructor(options: ApiGenSchema) {
    super(options);
  }
  public override template(): Source {
    return url("./files/index");
  }
  public override variables(): { [name: string]: any } {
    return { ...this.options };
  }
  public override name() {
    return "";
  }
  public override fileName() {
    return "index";
  }
  public override directory() {
    return "";
  }
  public override fullName() {
    return this.name();
  }
  public override importTypes(): string[] {
    return [];
  }
}

export class Metadata extends Base {
  constructor(
    options: ApiGenSchema,
    private meta: ODataMetadata,
  ) {
    super(options);
  }
  public override template(): Source {
    return url("./files/metadata");
  }
  public override variables(): { [name: string]: any } {
    return { content: JSON.stringify(this.meta.toJson(), null, 2) };
  }
  public override name() {
    return "";
  }
  public override fileName() {
    return "metadata";
  }
  public override directory() {
    return "";
  }
  public override fullName() {
    return this.name();
  }
  public override importTypes(): string[] {
    return [];
  }
}
