import {AView} from 'tdp_core/src/views/AView';

export default class <%-module%> extends AView {

  protected initImpl() {
    super.initImpl();
    return this.build();
  }

  private build() {
    this.node.innerHTML = `<strong>Hello World</strong>`;
    return null;
  }
}
