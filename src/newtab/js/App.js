import '../css/newtab.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

import { ConfigService } from './services/ConfigService';
import { StorageService } from './services/StorageService';
import { LinksService } from './services/LinksService';
import {MoveLinksService} from "./services/MoveLinksService";

export function app_interface() {   
    const storageService = StorageService();

    const configService = ConfigService(storageService);
    const linksService = LinksService(configService, storageService);
    const moveLinksService = MoveLinksService(configService, linksService);
     
    linksService.loadLinks();   
}