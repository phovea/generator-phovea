/// <reference types="jest" />
import {hello} from '../src/index';

describe('index', () => {
  it('hello', () => {
    expect(hello()).toEqual('Hello World');
    expect(hello({})).toEqual('Hello World');
    expect(hello({ name: 'Test' })).toEqual('Hello Test');
  });
});
