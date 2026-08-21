import '../css/newtab.css';

import { ConfigService } from './services/ConfigService';
import { StorageService } from './services/StorageService';
import { LinksService } from './services/LinksService';
import {MoveLinksService} from "./services/MoveLinksService";
import { ImportExportService } from './services/ImportExportService';

export function app_interface() {
    const searchBar = document.getElementById('search-bar');

    const storageService = StorageService();

    const configService = ConfigService(storageService, () => {
        searchBar.value = '';
        linksService.filterLinks(searchBar.value);
        searchBar.focus();
    });

    const linksService = LinksService(configService, storageService);
    // Called for its side effects: registers the drag & drop listeners on #app-zone.
    MoveLinksService(configService, linksService);
    const importExportService = ImportExportService(configService, storageService);

    configService.setImportAction(() => importExportService.importLinks(() => linksService.loadLinks(true)));
    configService.setExportAction(() => importExportService.exportLinks());
    configService.setExportHtmlAction(() => importExportService.exportHtml());


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
