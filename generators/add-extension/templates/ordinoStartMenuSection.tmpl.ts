import {IPluginDesc} from 'phovea_core/src/plugin';
import {INamedSet} from 'tdp_core/src/storage';
import {IStartMenuSection, IStartMenuSectionOptions} from 'ordino/src/extensions';
import {resolve} from 'phovea_core/src/idtype';
import NamedSetList from 'tdp_core/src/storage/NamedSetList';

export default class <%-module%> implements IStartMenuSection {
  private readonly idType = resolve('TODO');
  private readonly list: NamedSetList;

  constructor(parent: HTMLElement, public readonly desc: IPluginDesc, options: IStartMenuSectionOptions) {

    const createSession = (namedSet: INamedSet) => {
      if (options.session) {
        options.session((<any>this.desc).viewId, {namedSet}, {});
      } else {
        console.error('no session factory given to push new views');
      }
    };
    this.list = new NamedSetList(this.idType, createSession, parent.ownerDocument);

    // read species
    const initial: string[] = ['all'];

    // convert species to namedset
    this.list.push(...initial.map((d) => {
      return <INamedSet>{
        name: d,
        description: '',
        idType: '',
        ids: '',
        subTypeKey: '',
        subTypeValue: d,
        creator: ''
      };
    }));

    parent.appendChild(this.list.node);
  }

  push(namedSet: INamedSet) {
    if (namedSet.idType !== this.idType.id) {
      return false;
    }
    this.list.push(namedSet);
    return true;
  }
}
