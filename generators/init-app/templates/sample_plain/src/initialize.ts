/**
 * Created by Caleydo Team on 31.08.2016.
 */


import {App} from './app/App';
import {AppHeaderLink, AppHeader} from 'tdp_core';
import {APP_NAME} from './language';

AppHeader.create(
  <HTMLElement>document.querySelector('#caleydoHeader'),
  { appLink: new AppHeaderLink(APP_NAME) }
);

const parent = document.querySelector('#app');
App.create(parent).init();
