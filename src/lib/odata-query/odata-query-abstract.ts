import { Utils } from '../utils/utils';
import { ODataService } from '../odata-service/odata.service';

export abstract class ODataQueryAbstract {
  protected static readonly BOUNDARY_PREFIX_SUFFIX = '--';
  protected static readonly BATCH_PREFIX = 'batch_';
  protected static readonly CHANGESET_PREFIX = 'changeset_';
  protected static readonly NEWLINE = '\r\n';

  // URL QUERY PARTS
  protected static readonly SEPARATOR = '&';
  protected static readonly PATHSEP = '/';

  // OPTIONS NAMES
  public static readonly SELECT = 'select';
  public static readonly RAWFILTER = 'rawFilter';
  public static readonly FILTER = 'filter';
  public static readonly SEARCH = 'search';
  public static readonly GROUP_BY = 'groupBy';
  public static readonly TRANSFORM = 'transform';
  public static readonly ORDER_BY = 'orderBy';
  public static readonly TOP = 'top';
  public static readonly SKIP = 'skip';
  public static readonly EXPAND = 'expand';

  // SEGMENT NAMES
  protected static readonly METADATA = 'metadata';
  protected static readonly ENTITY_SET = 'entitySet';
  protected static readonly ENTITY_KEY = 'entityKey';
  protected static readonly SINGLETON = 'singleton';
  protected static readonly TYPE_NAME = 'typeName';
  protected static readonly PROPERTY = 'property';
  protected static readonly NAVIGATION_PROPERTY = 'navigationProperty';
  protected static readonly REF = 'ref';
  protected static readonly VALUE = 'value';
  protected static readonly COUNT = 'count';
  protected static readonly FUNCTION_CALL = 'functionCall';
  protected static readonly ACTION_CALL = 'actionCall';

  // CONSTANT SEGMENTS
  protected static readonly $BATCH = '$batch';
  protected static readonly $METADATA = '$metadata';
  protected static readonly $REF = '$ref';
  protected static readonly $VALUE = '$value';
  protected static readonly $COUNT = '$count';

  // VARIABLES
  protected odataService: ODataService;
  protected queryString: string;

  // HEADERS
  protected static readonly HTTP11 = 'HTTP/1.1';
  protected static readonly ODATA_VERSION = 'OData-Version';
  protected static readonly CONTENT_TYPE = 'Content-Type';
  protected static readonly ACCEPT = 'Accept';
  protected static readonly CONTENT_TRANSFER_ENCODING = 'Content-Transfer-Encoding';
  protected static readonly CONTENT_ID = 'Content-ID';

  // HEADER VALUES
  protected static readonly VERSION_4_0 = '4.0';
  protected static readonly MULTIPART_MIXED = 'multipart/mixed';
  protected static readonly MULTIPART_MIXED_BOUNDARY = 'multipart/mixed;boundary=';
  protected static readonly APPLICATION_HTTP = 'application/http';
  protected static readonly BINARY = 'binary';
  protected static readonly APPLICATION_JSON = 'application/json';

  constructor(odataService: ODataService) {
    Utils.requireNotNullNorUndefined(odataService, 'odataService');
    this.odataService = odataService;
    this.queryString = "";
  }

  protected abstract toString();
}
