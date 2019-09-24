export class ODataEntitySet<T> {
  public static readonly ODATA_COUNT = '@odata.count';
  public static readonly ODATA_NEXT_LINK = '@odata.nextLink';

  private static readonly SET_VALUE = 'value';

  entities: T[];
  count: number;
  skip: number;
  skiptoken: number;

  constructor(json: any) {
    this.entities = json[ODataEntitySet.SET_VALUE] || [];
    if (json.hasOwnProperty(ODataEntitySet.ODATA_COUNT)) {
      this.count = json[ODataEntitySet.ODATA_COUNT];
    }
    if (json.hasOwnProperty(ODataEntitySet.ODATA_NEXT_LINK)) {
      let url = json[ODataEntitySet.ODATA_NEXT_LINK];
      let match = url.match(/\$skip=(\d+)/);
      if (match) {
        this.skip = Number(match[1]);
      }
      match = url.match(/\$skiptoken=(\d+)/);
      if (match) {
        this.skiptoken = Number(match[1]);
      }
    }
  }
}
