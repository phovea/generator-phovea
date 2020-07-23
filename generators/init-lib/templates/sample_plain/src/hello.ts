
import {BaseUtils} from 'phovea_core';

export interface IHelloOptions {
  name?: string;
}

export function hello(options?: IHelloOptions) {
  //merge with default options
  options = BaseUtils.mixin({
    name: 'World'
  }, options);
  return `Hello ${options.name}`;
}
