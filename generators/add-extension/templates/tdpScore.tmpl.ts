import {IScore, IScoreRow} from 'tdp_core/src/extensions';
import {resolve} from 'phovea_core/src/idtype';
import {numberCol} from 'tdp_core/src/lineup';
import {nameLookupDesc, FormDialog} from 'tdp_core/src/form';
import {getTDPScore} from 'tdp_core/src/rest';

/**
 * interface describing the parameter needed for MyScore
 */
export interface I<%-moduleName%>Param {
  // TODO
}

/**
 * score implementation in this case a numeric score is computed
 */
export default class <%-moduleName%> implements IScore<number> {

  /**
   * defines the IDType of which score values are returned. A score row is a pair of id and its score, e.g. {id: 'EGFR', score: 100}
   * @type {IDType}
   */
  readonly idType = resolve('TODO');

  constructor(private readonly params: I<%-module%>Param) {

  }

  /**
   * creates the column description used within LineUp to create the oclumn
   * @returns {IAdditionalColumnDesc}
   */
  createDesc() {
    const label = `<%-moduleName%> of ${this.params}`;
    return numberCol('', 0, 100, {label});
  }

  /**
   * computes the actual scores and returns a Promise of IScoreRow rows
   * @returns {Promise<IScoreRow<number>[]>}
   */
  compute(): Promise<IScoreRow<number>[]> {
    return getTDPScore('TODO', `TODO`, this.params);
  }
}

/**
 * builter function for building the parameters of the MyScore
 * @returns {Promise<I<%-module%>Param>} a promise for the parameter
 */
export function create() {
  /**
   * a formDialog is a modal dialog showing a form to the user. The first argument is the dialog title, the second the label of the submit button
   * @type {FormDialog}
   */
  const dialog = new FormDialog('Add <%-extras.name || moduleName%>', 'Add');

  return dialog.showAsPromise((r) => {
    // retrieve the entered values, each one identified by its formID
    const data = r.getElementValues();
    return <I<%-moduleName%>Param>{
      // TODO
    };
  });
}
