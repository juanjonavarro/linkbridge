import '../css/newtab.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

import { ConfigService } from './services/ConfigService';
import { StorageService } from './services/StorageService';
import { LinksService } from './services/LinksService';
import {MoveLinksService} from "./services/MoveLinksService";
import {LogService} from "./services/LogService";
import Bowser from 'bowser';

export function app_interface() {
    const logger = LogService().getLogger();
    const searchBar = document.getElementById('search-bar');

    window.linkBridgeBrowserInfo = Bowser.getParser(navigator.userAgent);
    logger.log(window.linkBridgeBrowserInfo);

    const storageService = StorageService();

    const configService = ConfigService(storageService, () => {
        searchBar.value = '';
        linksService.filterLinks(searchBar.value);
    });

    const linksService = LinksService(configService, storageService);
    const moveLinksService = MoveLinksService(configService, linksService);


    searchBar.addEventListener('input', (e) => {
        linksService.filterLinks(e.target.value);
    });

    searchBar.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            linksService.clickFirstLink();
        }
    });

    linksService.loadLinks();

    searchBar.focus();
}