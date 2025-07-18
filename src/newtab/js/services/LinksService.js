import { EditLinkService } from './EditLinkService';
import { EditGroupService } from './EditGroupService';
import { APP_CONFIG } from '../AppConfig';
import { formatUrl, generateUUID } from '../utils';
import { LogService } from './LogService';

export function LinksService(configService, storageService) {
    const appListElement = document.getElementById('applications-list');
    const bookmarkListElement = document.getElementById('bookmarks-list'); 

    const logger = LogService().getLogger();

    const editLinkService = EditLinkService();
    const editGroupService = EditGroupService();

    const linksCategories = {
        'applications': 
            { 
                name: 'Applications', 
                storageKey: 'applicationsGroups',
                interface: linksCategoryInterface('applications', appListElement)
            },
        'bookmarks':
            {
                name: 'Bookmarks',
                storageKey: 'bookmarksGroups',
                interface: linksCategoryInterface('bookmarks', bookmarkListElement)
            }
    };

    configService.setImportAction(importLinks);
    configService.setExportAction(exportLinks);

    return {
        loadLinks,
        moveLink
    };
    
    function linksCategoryInterface(type, rootElement) {        
        let linksGroups = [];
                        
        return {
            get: function() {
                return linksGroups
            },
            set: function(groups) {
                linksGroups = groups;
            },
            draw: function() {      
                if (type === 'bookmarks') {
                    const addGroupButton = document.querySelector('#bookmarks-title .add-link');
                    addGroupButton.addEventListener('click', (event) => {
                        event.preventDefault();
                        logger.log("Add Group clicked for Bookmarks");
                        editGroupService.editGroup(null, (action, data) => {
                            if (action === "save") {
                                linksGroups.push({
                                    id: data.id,
                                    name: data.name,
                                    locked: false,
                                    links: []
                                });
                            }
                            saveLinks();
                            this.draw();
                        });
                    });
                }
                rootElement.innerHTML = `
                    ${linksGroups.map((group, groupIndex) => `
                        <div class="links-group">
                            <h1><span>${group.name}</span>
                                <a href="#" title="Add new link" class="config-element add-link"><i class="bi-plus-circle-dotted"></i></a>
                            </h1>
                            <ul class="links-group-links">
                                ${group.links.length===0 ? 
                                    `<li class="link drop-zone" data-category="${type}" data-groupidx="${groupIndex}" data-linkidx="0"></li>`
                                    : group.links.map((link, linkIndex) => `<li class="link" data-category="${type}" data-groupidx="${groupIndex}" data-linkidx="${linkIndex}">
                                    <a href="#" class="drag-handle config-element"><i class="bi bi-grip-vertical"></i></a>
                                    <a href="${link.url}" class="link-element">                                        
                                        ${link.icon_data ? `<img src="${link.icon_data}" class="link-icon">` : ''}
                                        <div class="link">
                                            <div class="link-name">${link.name}</div>
                                            <div class="link-url">${formatUrl(link.url)}</div>                                            
                                        </div>                                        
                                    </a>   
                                    <div class="link-edit config-element"><i class="bi-pencil-square"></i></div>                                 
                                    </li>`).join('')}
                            </ul>
                        </div>
                    `).join('')}
                `;

                rootElement.querySelectorAll('.links-group').forEach((group, groupIndex) => {
                    group.querySelector('h1 span').addEventListener('click', (event) => {
                        if (!configService.isConfigMode()) return; // Ignore clicks if not in config mode
                        event.preventDefault();
                        logger.log(`Group ${groupIndex} clicked: ${linksGroups[groupIndex].name}`);
                        editGroupService.editGroup(linksGroups[groupIndex], (action, data) => {
                            if (action === "save") {
                                linksGroups[groupIndex].name = data.name;
                            } else if (action === "delete") {
                                linksGroups.splice(groupIndex, 1);
                            }
                            saveLinks();
                            this.draw();
                        });
                    });

                    group.querySelectorAll('ul li.link a.link-element').forEach((link, linkIndex) => {
                        link.addEventListener('click', (event) => {
                            if (!configService.isConfigMode()) {
                                event.currentTarget.setAttribute('target', configService.get().open_in_new_tab ? '_blank' : '_self');
                                return;
                            }

                            event.preventDefault();

                            editLinkService.editLink(linksGroups[groupIndex].links[linkIndex], (action, data) => {
                                if (action === "save") {
                                    linksGroups[groupIndex].links[linkIndex].id = data.id;
                                    linksGroups[groupIndex].links[linkIndex].name = data.name;
                                    linksGroups[groupIndex].links[linkIndex].url = data.url;  
                                    linksGroups[groupIndex].links[linkIndex].icon_id = data.icon_id;
                                    linksGroups[groupIndex].links[linkIndex].icon_data = data.icon_data;                                  
                                } else if (action === "delete") {
                                    linksGroups[groupIndex].links.splice(linkIndex, 1);
                                }
                                saveLinks();
                                this.draw();
                            });
                        });
                    });

                    group.querySelectorAll('.add-link').forEach((el) => {
                        el.addEventListener('click', (event) => {
                            event.preventDefault();
                            logger.log(`Add Link clicked in Group ${groupIndex}`);
                            editLinkService.editLink(null, (action, data) => {
                                if (action === "save") {
                                    linksGroups[groupIndex].links.push({
                                        id: data.id,
                                        name: data.name,
                                        url: data.url,
                                        icon_id: data.icon_id,
                                        icon_data: data.icon_data
                                    });
                                }
                                saveLinks();
                                this.draw();
                            });
                        });
                    });
                });
            }
        };
    }

    function moveLink(sourceCategory, sourceGroupIndex, sourceLinkIndex,
                       targetCategory, targetGroupIndex, targetLinkIndex) {
        logger.log(`Move link from ${sourceCategory} ${sourceGroupIndex} ${sourceLinkIndex} to ${targetCategory} ${targetGroupIndex} ${targetLinkIndex}`);

        const element = linksCategories[sourceCategory].interface.get()[sourceGroupIndex].links[sourceLinkIndex];
        logger.log(element);

        if (sourceCategory === targetCategory && sourceGroupIndex === targetGroupIndex) {
            // If moving a link within the same group, in a previous position, increment the link index to delete
            if (sourceLinkIndex > targetLinkIndex) {
                sourceLinkIndex++;
            } else if (sourceLinkIndex < targetLinkIndex) {
                targetLinkIndex++;
            }
        }
        linksCategories[targetCategory].interface.get()[targetGroupIndex].links.splice(targetLinkIndex, 0, element);
        linksCategories[sourceCategory].interface.get()[sourceGroupIndex].links.splice(sourceLinkIndex, 1);

        saveLinks();
        drawLinks();
    }
    
    function loadLinks() {
        storageService.get(['configuration' ], (data) => {
            if (data.configuration && data.configuration.theme) {
                configService.changeTheme(data.configuration.theme, data.configuration.them_style);
            } else {
                configService.changeTheme(APP_CONFIG.DEFAULT_THEME, APP_CONFIG.DEFAULT_THEME_STYLE);
            }
            if (data.configuration && data.configuration.page_title) {
                document.title = data.configuration.page_title;
            } else {
                document.title = APP_CONFIG.DEFAULT_PAGE_TITLE;
            }
            // continue loading after changing the theme
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    storageService.get(null, async (data) => {
                        let configuration = data.configuration || {
                            status: 'config-pending'
                        };
                        let applications;
                        let bookmarks;
                        let images = [];

                        if (configuration.status === 'config-pending') {
                            logger.log("Configuration is pending, loading default links.");
                            let default_config = await fetch("../../default_links.json");                
                            let config_json = await default_config.json();
                            
                            configuration.status = 'active';
                            configuration.theme = APP_CONFIG.DEFAULT_THEME;
                            configuration.theme_style = APP_CONFIG.DEFAULT_THEME_STYLE;
                            configuration.page_title = APP_CONFIG.DEFAULT_PAGE_TITLE;
                            configuration.config_version = APP_CONFIG.APP_CONFIG_FORMAT;

                            applications = config_json.applications;
                            bookmarks = config_json.bookmarks;
                            images = config_json.images || [];
                        } else {
                            logger.log("Loading links from storage.");
                            applications = data.applicationsGroups || [];
                            bookmarks = data.bookmarksGroups || [];                            
                            Object.keys(data).forEach(key => {
                                if (key.startsWith('image:')) {
                                    images.push({
                                        id: key,
                                        data: data[key]
                                    });
                                }
                            });
                            if (configuration.config_version !== APP_CONFIG.APP_CONFIG_FORMAT) {
                                // TODO Convert old config to new format
                                
                            }
                            configuration.theme = configuration.theme || APP_CONFIG.DEFAULT_THEME;
                            configuration.theme_style = configuration.theme_style || APP_CONFIG.DEFAULT_THEME_STYLE;
                            configuration.page_title = configuration.page_title || APP_CONFIG.DEFAULT_PAGE_TITLE;
                            configuration.config_version = APP_CONFIG.APP_CONFIG_FORMAT;
                        }            

                        configService.init(configuration);
                        configService.saveConfig();
                        
                        linksCategories.applications.interface.set(applications);
                        linksCategories.bookmarks.interface.set(bookmarks);

                        loadImages(images);
                        drawLinks();

                        saveLinks();
                    });
                });
            });
        });
    }

    function saveLinks() {
        let images = [];
        let categories = {};

        for (const category of Object.values(linksCategories)) {
            categories[category.storageKey] = []
            category.interface.get().forEach((group) => {
                let links = group.links.map(link => {
                    if (link.icon_id && link.icon_id.startsWith('image:')) {
                        images.push({
                            id: link.icon_id,
                            data: link.icon_data
                        });
                    }
                    return {
                        id: link.id || generateUUID(),
                        name: link.name,
                        url: link.url,
                        icon_id: link.icon_id,
                    };
                });
                categories[category.storageKey].push({
                    name: group.name,
                    id: group.id || generateUUID(),
                    locked: group.locked || false,
                    links: links
                });
            });

        }

        storageService.set(categories, () => {
            logger.log("Links saved successfully.");
        });

        // save new images and remove old ones
        storageService.get(null, (items) => {
            let imagesToAdd = {};

            images.forEach(image => {
                if (!items[image.id]) {
                    imagesToAdd[image.id] = image.data;
                }
            });
            if (Object.keys(imagesToAdd).length > 0) {
                storageService.set(imagesToAdd, () => {
                    logger.log("New images saved successfully.");
                    logger.log(imagesToAdd);
                });
            }

            let imagesToRemove = [];
            Object.keys(items).forEach(key => {
                if (key.startsWith('image:') && !images.some(img => img.id === key)) {
                    imagesToRemove.push(key);
                }
            });
            if (imagesToRemove.length > 0) {
                storageService.remove(imagesToRemove, () => {
                    logger.log("Old images removed successfully.");
                    logger.log(imagesToRemove);
                });
            }
        });
    }

    function loadImages(images) {
        for (const category of Object.values(linksCategories)) {
            let groups = category.interface.get();
            for (const group of groups) {
                for (const link of group.links) {
                    if (link.icon_id && link.icon_id.startsWith('image:')) {
                        for (const image of images) {
                            if (image.id === link.icon_id) {
                                link.icon_data = image.data;
                                break;
                            }
                        }
                    } else {
                        link.icon_data = null;
                    }
                }
            }            
        }
    }

    function drawLinks() {
        for (const category of Object.values(linksCategories)) {
            category.interface.draw();
        }
    }

    function exportLinks() {
            storageService.get(null, (items) => {
            const images = [];
            Object.keys(items).forEach(key => {
                if (key.startsWith('image:')) {
                    images.push({
                        id: key,
                        data: items[key]
                    });
                } 
            });

            const exportData = {
                export_version: APP_CONFIG.EXPORT_CONFIG_FORMAT,
                applications: items.applicationsGroups || [],
                bookmarks: items.bookmarksGroups || [],
                images
            };                

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // Set YYYYMMDD_HHMMSS as filename (filling with zeros if needed)
            const date = new Date();
            const year = date.getFullYear().toString().padStart(4, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const seconds = date.getSeconds().toString().padStart(2, '0');
            a.download = `links_export_${year}${month}${day}_${hours}${minutes}${seconds}.json`;

            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    function importLinks() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        if (data.export_version !== APP_CONFIG.EXPORT_CONFIG_FORMAT) {
                            alert("Unsupported import file format.");
                            return;
                        }
                        if (data.applications && data.bookmarks && data.images) {
                            const result = confirm("Are you sure you want to import this data? This will overwrite your current groups and links.");
                            if (!result) {
                                return;
                            }

                            let importData = {};
                            importData.applicationsGroups = data.applications;
                            importData.bookmarksGroups = data.bookmarks;

                            for (const image of data.images) {
                                importData[image.id] = image.data;
                            }
                            
                            storageService.set(importData, () => {
                                logger.log("Import data saved successfully.");
                                loadLinks();
                                alert("Links imported successfully.");
                            });
                        } else {
                            alert("Invalid import file format.");
                        }
                    } catch (error) {
                        alert("Error reading import file: " + error.message);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }
    
}