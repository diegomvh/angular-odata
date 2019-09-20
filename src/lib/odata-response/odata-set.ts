export class ODataSet<T> {
  public static readonly ODATA_COUNT = '@odata.count';
  public static readonly ODATA_NEXT_LINK = '@odata.nextLink';

  private static readonly SET_VALUE = 'value';

  entities: T[];
  count: number;
  skip: number;

  constructor(json: any) {
    this.entities = json[ODataSet.SET_VALUE] || [];
    this.count = json[ODataSet.ODATA_COUNT] || this.entities.length;
    if (json.hasOwnProperty(ODataSet.ODATA_NEXT_LINK)) {
      let url = json[ODataSet.ODATA_NEXT_LINK];
      let match = url.match(/\$skip=(\d+)/) || url.match(/\$skiptoken=(\d+)/);
      if (match) {
        this.skip = Number(match[1]);
      }
    }
  }
}
