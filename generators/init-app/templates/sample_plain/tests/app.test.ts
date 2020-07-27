/// <reference types="jest" />
import {App} from '../src/app/App';

describe('create', () => {
  it('is method', () => {
    expect(typeof App.create).toEqual('function');
  });
});
