export class CsdlNavigationPropertyBinding {
  Path: string;
  Target: string;

  constructor({ Path, Target }: { Path: string; Target: string }) {
    this.Path = Path;
    this.Target = Target;
  }

  toJson() {
    return {
      Path: this.Path,
      Target: this.Target,
    };
  }
}
