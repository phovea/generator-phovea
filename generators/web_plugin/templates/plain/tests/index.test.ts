import {transform} from '../src/d3util';

describe('transform', () => {
  it('empty', () => {
    expect(transform().toString()).toEqual('translate(0,0)rotate(0)skewX(0)scale(1,1)');
  });
});
