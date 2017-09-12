
import {IResult, ISearchProvider} from 'bob/src/extensions';
import {getTDPFilteredRows, getTDPLookup} from 'tdp_core/src/rest';
// import './styles/idtype_color.scss';


export default class <%-moduleName%> implements ISearchProvider {
  private readonly database = 'TODO';
  private readonly table = 'TODO';

  search(query: string, page: number, pageSize: number) {
    return getTDPLookup(this.database, `${this.table}_items`, {
      column: `name`,
      query,
      page: page + 1, //required to start with 1 instead of 0
      limit: pageSize
    });
  }

  validate(query: string[]): Promise<IResult[]> {
    return getTDPFilteredRows(this.database, `${this.table}_items_verify`, {}, {
      name: query
    });
  }
}
