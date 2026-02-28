import { APP_CONFIG } from "../AppConfig";

export function LogService() {
    const console = APP_CONFIG.DEBUG ? window.console : {
        log: () => {},
        warn: () => {},
        error: () => {},
        info: () => {}
    };

    return {
        getLogger: function() {
            return console;
        }
    }
}