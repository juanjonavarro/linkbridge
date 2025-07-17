import '../css/newtab.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

import { ConfigService } from './services/ConfigService';
import { StorageService } from './services/StorageService';
import { LinksService } from './services/LinksService';

export function app_interface() {   
    const storageService = StorageService();

    const configService = ConfigService(storageService);
    const linksService = LinksService(configService, storageService);    
     
    linksService.loadLinks();   
}