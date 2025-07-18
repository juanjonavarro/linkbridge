import { APP_CONFIG } from '../AppConfig';
import { LogService } from './LogService';
import {InfoDialogService} from "./InfoDialogService";

export function ConfigService(storageService) {
    const body = document.querySelector('body');   
    const appRoot = document.getElementById('app');
    const configButton = document.getElementById('config-button');
    const openInNewTabCheckbox = document.getElementById('open-in-new-tab');
    const pageTitleInput = document.getElementById('config-page-title');
    const exportLinksButton = document.getElementById('export-links');
    const importLinksButton = document.getElementById('import-links');
    const themeSelector = document.getElementById('theme-selector');
    const aboutLink = document.getElementById('about-link');

    const logger = LogService().getLogger();
    
    let configuration = null;

    let configMode = false;

    // Config button
    configButton.addEventListener('click', () => {
        appRoot.classList.toggle('config-mode');
        configMode = !configMode;
    });

    // Open in new tab checkbox management
    openInNewTabCheckbox.addEventListener('change', () => {
        configuration.open_in_new_tab = openInNewTabCheckbox.checked;
        saveConfig();
    });

    // Page title management
    pageTitleInput.addEventListener('input', () => {
        configuration.page_title = pageTitleInput.value.trim() || APP_CONFIG.DEFAULT_PAGE_TITLE;
        document.title = configuration.page_title;
        saveConfig();
    });

    aboutLink.addEventListener('click', () => {
        InfoDialogService().open("About this extension", `
            <p>
              This browser extension was created by <a href="https://www.juanjonavarro.com" target="_blank">Juanjo Navarro</a>.
            </p>
            <p>
              I created it inspired by <a href="https://github.com/pawelmalak/flame" target="_blank">Flame</a>, which in turn was inspired by 
              <a href="https://github.com/jeroenpardon/sui" target="_blank">SUI</a>.
            </p>
            <p>
              As a frequent user of Flame, I wanted to create a version that anyone, even without technical knowledge, could enjoy directly, without needing to set up a server.
            </p>
            <p>
              While no code from Flame or SUI has been used, the visual design is strongly inspired by both projects.
            </p>
        `);
    });


    return {
        get: getConfiguration,
        set: setConfiguration,
        isConfigMode,
        saveConfig,
        init,
        changeTheme,
        setExportAction,
        setImportAction
    }



    function init(config) {
        setConfiguration(config);

        openInNewTabCheckbox.checked = configuration.open_in_new_tab || false;
        pageTitleInput.value = configuration.page_title || '';

        displayThemes();
    }

    function setExportAction(action) {
        exportLinksButton.addEventListener('click', action);
    }

    function setImportAction(action) {
        importLinksButton.addEventListener('click', action);
    }

    function isConfigMode()  {
        return configMode;
    }

    function saveConfig() {
        storageService.set({configuration}, () => {
            logger.log("Configuration saved successfully.");
        });
    }

    function getConfiguration() {
        return configuration;
    }

    function setConfiguration(config) {
        configuration = config;
    }  

    // Theme selection

    function displayThemes() {
        themeSelector.innerHTML = APP_CONFIG.THEMES.map(theme => `
            <a href="" 
            class="theme-option ${configuration.theme === theme.id ? 'selected' : ''}"
            data-theme="${theme.id}" data-style="${theme.style}">
            <div class="title">${theme.name}</div>
            <div class="example">
                <div class="background theme-${theme.id} theme-style-${theme.style}"></div>
                <div class="primary theme-${theme.id} theme-style-${theme.style}"></div>
                <div class="secondary theme-${theme.id} theme-style-${theme.style}"></div>
            </div>
            </a>
        `).join('');

        themeSelector.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', (event) => {
                event.preventDefault();
                const selectedTheme = event.currentTarget.dataset.theme;
                const selectedStyle = event.currentTarget.dataset.style;
                logger.log("Selected theme:", selectedTheme, "style:", selectedStyle);
                configuration.theme = selectedTheme;
                configuration.them_style = selectedStyle;

                changeTheme(configuration.theme, configuration.them_style);
                
                saveConfig();
                displayThemes();
            });
        });
    }

    function changeTheme(theme, style) {
        body.className = body.className.replace(/theme-[\w-]+/g, '');
        body.className = body.className.replace(/theme-style-[\w-]+/g , '');

        if (theme && APP_CONFIG.THEMES.some(t => t.id === theme)) {
            body.classList.add(`theme-${theme}`);
            body.classList.add(`theme-style-${style}`);
            logger.log("Theme changed to:", theme, "style:", style);
        } else {
            logger.log("Invalid theme:", theme);
        }        
    }

}
