/// <reference types="jest" />
import {hello} from '../src/hello';

describe('index', () => {
  it('hello', () => {
    expect(hello()).toEqual('Hello World');
    expect(hello({})).toEqual('Hello World');
    expect(hello({ name: 'Test' })).toEqual('Hello Test');
  });
});
