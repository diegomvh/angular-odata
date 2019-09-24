export class ODataEntitySet<T> {
  public static readonly ODATA_COUNT = '@odata.count';
  public static readonly ODATA_NEXT_LINK = '@odata.nextLink';

  private static readonly SET_VALUE = 'value';

  entities: T[];
  count: number;
  nextLink: string;

  constructor(json: any) {
    this.entities = json[ODataEntitySet.SET_VALUE] || [];
    if (json.hasOwnProperty(ODataEntitySet.ODATA_COUNT)) {
      this.count = json[ODataEntitySet.ODATA_COUNT];
    }
    if (json.hasOwnProperty(ODataEntitySet.ODATA_NEXT_LINK)) {
      this.nextLink = decodeURIComponent(json[ODataEntitySet.ODATA_NEXT_LINK]);
    }
  }

  get skip(): number {
    let match = this.nextLink.match(/\$skip=(\d+)/);
    if (match) return Number(match[1]);
  }

  get skiptoken(): number {
    let match = this.nextLink.match(/\$skiptoken=(\d+)/);
    if (match) return Number(match[1]);
  }

}
