import { EditLinkService } from './EditLinkService';
import { EditGroupService } from './EditGroupService';
import { APP_CONFIG } from '../AppConfig';
import { esc, formatUrl, generateUUID, safeIconData, safeUrl } from '../utils';
import { LogService } from './LogService';

export function LinksService(configService, storageService) {
    const appZoneElement = document.getElementById('app-zone');
    const appListElement = document.getElementById('applications-list');
    const bookmarkListElement = document.getElementById('bookmarks-list');

    const logger = LogService().getLogger();

    const editLinkService = EditLinkService();
    const editGroupService = EditGroupService();

    let filterText = '';

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
    configService.setExportHtmlAction(exportHtml);

    return {
        loadLinks,
        moveLink,
        filterLinks,
        clickFirstLink
    };

    function filterLinks(input) {
        filterText = input.toLowerCase();
        drawLinks();
    }

    function linkMatchesFilter(link) {
        if (!filterText) return true;

        const name = String(link.name ?? '').toLowerCase();
        const url = String(link.url ?? '').toLowerCase();

        return name.includes(filterText) || url.includes(filterText);
    }

    function clickFirstLink() {
        const firstLink = appZoneElement.querySelector('.link-element');
        if (firstLink) {
            firstLink.click();
        }
    }

    function linksCategoryInterface(type, rootElement) {
        let linksGroups = [];

        const categoryInterface = {
            get: function () {
                return linksGroups
            },
            set: function (groups) {
                linksGroups = groups;
            },
            draw: function () {
                rootElement.innerHTML = `
                    ${linksGroups.filter(group => !filterText || group.links.some(link => linkMatchesFilter(link))).map((group, groupIndex) => `
                        <div class="links-group">
                            <h1><span>${esc(group.name)}</span>
                                <a href="#" title="Add new link" class="config-element add-link"><svg class="icon" width="1em" height="1em" fill="currentColor" aria-hidden="true" focusable="false"><use href="#icon-plus-circle-dotted"></use></svg></a>
                            </h1>
                            <ul class="links-group-links">
                                ${group.links.length === 0 ?
                        `<li class="link drop-zone" data-category="${type}" data-groupidx="${groupIndex}" data-linkidx="0"></li>`
                        : group.links.filter(link => linkMatchesFilter(link)).map((link, linkIndex) => `<li class="link" data-category="${type}" data-groupidx="${groupIndex}" data-linkidx="${linkIndex}">
                                    <a href="#" class="drag-handle config-element"><svg class="icon" width="1em" height="1em" fill="currentColor" aria-hidden="true" focusable="false"><use href="#icon-grip-vertical"></use></svg></a>
                                    <a href="${esc(safeUrl(link.url))}" class="link-element">
                                        ${safeIconData(link.icon_data) ? `<img src="${esc(safeIconData(link.icon_data))}" class="link-icon">` : ''}
                                        <div class="link-body">
                                            <div class="link-name">${esc(link.name)}</div>
                                            <div class="link-url">${esc(formatUrl(link.url))}</div>
                                        </div>                                        
                                    </a>   
                                    <div class="link-edit config-element"><svg class="icon" width="1em" height="1em" fill="currentColor" aria-hidden="true" focusable="false"><use href="#icon-pencil-square"></use></svg></div>
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
                            categoryInterface.draw();
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
                                categoryInterface.draw();
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
                                categoryInterface.draw();
                            });
                        });
                    });
                });
            }
        };

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
                    categoryInterface.draw();
                });
            });
        }

        return categoryInterface;
    }

    function moveLink(sourceCategory, sourceGroupIndex, sourceLinkIndex,
        targetCategory, targetGroupIndex, targetLinkIndex) {
        sourceGroupIndex = parseInt(sourceGroupIndex);
        sourceLinkIndex = parseInt(sourceLinkIndex);
        targetGroupIndex = parseInt(targetGroupIndex);
        targetLinkIndex = parseInt(targetLinkIndex);

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

    function imprimeGrupo(msg, grupo) {
        logger.log(msg);
        grupo.forEach((link, idx) => {
            logger.log(idx, link);
        });
    }

    function loadLinks() {
        storageService.get(['configuration'], (data) => {
            if (data.configuration && data.configuration.theme) {
                configService.changeTheme(data.configuration.theme);
            } else {
                configService.changeTheme(APP_CONFIG.DEFAULT_THEME);
            }
            if (data.configuration && data.configuration.page_title) {
                document.title = data.configuration.page_title;
            } else {
                document.title = APP_CONFIG.DEFAULT_PAGE_TITLE;
            }
            storageService.setBootCache('title-cached', document.title);
            // Yield so the browser can paint the themed background before the heavy
            // read and render below. A timer fires even when no frames are composited;
            // requestAnimationFrame does not, and the whole load used to hang on it.
            setTimeout(() => {
                storageService.get(null, async (data) => {
                    let configuration = data.configuration || {
                        status: 'config-pending'
                    };
                    let applications;
                    let bookmarks;
                    let images = [];
                    const isFirstRun = configuration.status === 'config-pending';

                    if (isFirstRun) {
                        logger.log("Configuration is pending, loading default links.");
                        const defaultConfigUrl = new URL('../default_links.json', import.meta.url);
                        let default_config = await fetch(defaultConfigUrl);
                        let config_json = await default_config.json();

                        configuration.status = 'active';
                        configuration.theme = APP_CONFIG.DEFAULT_THEME;
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
                        configuration.page_title = configuration.page_title || APP_CONFIG.DEFAULT_PAGE_TITLE;
                        configuration.config_version = APP_CONFIG.APP_CONFIG_FORMAT;
                    }

                    configService.init(configuration);

                    linksCategories.applications.interface.set(applications);
                    linksCategories.bookmarks.interface.set(bookmarks);

                    loadImages(images);
                    drawLinks();

                    // Only the first run needs to persist: it is the only path where the data
                    // (default links and images) does not come from storage.
                    if (isFirstRun) {
                        configService.saveConfig();
                        saveLinks();
                    }
                });
            }, 0);
        });
    }

    function saveLinks() {
        let images = [];
        let categories = {};

        for (const category of Object.values(linksCategories)) {
            categories[category.storageKey] = []
            category.interface.get().forEach((group) => {
                group.id ||= generateUUID();
                let links = group.links.map(link => {
                    link.id ||= generateUUID();
                    if (link.icon_id && link.icon_id.startsWith('image:')) {
                        images.push({
                            id: link.icon_id,
                            data: link.icon_data
                        });
                    }
                    return {
                        id: link.id,
                        name: link.name,
                        url: link.url,
                        icon_id: link.icon_id,
                    };
                });
                categories[category.storageKey].push({
                    name: group.name,
                    id: group.id,
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
                        if (Array.isArray(data.applications) && Array.isArray(data.bookmarks) && Array.isArray(data.images)) {
                            const result = confirm("Are you sure you want to import this data? This will overwrite your current groups and links.");
                            if (!result) {
                                return;
                            }

                            const skippedLinks = [];
                            let skippedImages = 0;

                            let importData = {};
                            importData.applicationsGroups = sanitizeGroups(data.applications, skippedLinks);
                            importData.bookmarksGroups = sanitizeGroups(data.bookmarks, skippedLinks);

                            for (const image of data.images) {
                                if (typeof image.id === 'string' && image.id.startsWith('image:') && safeIconData(image.data)) {
                                    importData[image.id] = image.data;
                                } else {
                                    skippedImages++;
                                }
                            }

                            storageService.set(importData, () => {
                                logger.log("Import data saved successfully.");
                                loadLinks();
                                alert("Links imported successfully." + importReport(skippedLinks, skippedImages));
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

    function sanitizeGroups(groups, skippedLinks) {
        return groups.map(group => ({
            id: typeof group.id === 'string' ? group.id : generateUUID(),
            name: String(group.name ?? ''),
            locked: !!group.locked,
            links: (Array.isArray(group.links) ? group.links : []).flatMap(link => {
                const url = safeUrl(link.url);
                if (url === '#') {
                    skippedLinks.push(`${String(group.name ?? '')} / ${String(link.name ?? '')}`);
                    return [];
                }
                return [{
                    id: typeof link.id === 'string' ? link.id : generateUUID(),
                    name: String(link.name ?? ''),
                    url: url,
                    icon_id: typeof link.icon_id === 'string' ? link.icon_id : null
                }];
            })
        }));
    }

    function importReport(skippedLinks, skippedImages) {
        if (skippedLinks.length === 0 && skippedImages === 0) {
            return '';
        }
        let report = '';
        if (skippedLinks.length > 0) {
            report += `\n\n${skippedLinks.length} link(s) skipped, URL is not http:// or https://\n`;
            report += skippedLinks.slice(0, 10).map(l => `  - ${l}`).join('\n');
            if (skippedLinks.length > 10) {
                report += `\n  ... and ${skippedLinks.length - 10} more`;
            }
        }
        if (skippedImages > 0) {
            report += `\n\n${skippedImages} icon(s) skipped, not a valid image.`;
        }
        return report;
    }

    async function exportHtml() {
        const cssContent = await getEmbeddedCss();
        const htmlContent = generateStaticHtml(cssContent);

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'linkbridge.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async function getEmbeddedCss() {
        let cssString = '';
        for (const sheet of document.styleSheets) {
            try {
                if (sheet.href) {
                    const response = await fetch(sheet.href);
                    let cssText = await response.text();

                    // Handle font face imports/urls
                    const urlRegex = /url\(['"]?([^'")]+)['"]?\)/g;
                    const resourceUrls = new Set(
                        [...cssText.matchAll(urlRegex)]
                            .map(match => match[1])
                            .filter(url => !url.startsWith('data:'))
                    );
                    const embeddedResources = new Map();
                    for (const originalUrl of resourceUrls) {
                        // Construct absolute URL
                        const absoluteUrl = new URL(originalUrl, sheet.href).href;

                        try {
                            const fontResponse = await fetch(absoluteUrl);
                            const fontBlob = await fontResponse.blob();
                            const reader = new FileReader();
                            const base64Font = await new Promise(resolve => {
                                reader.onloadend = () => resolve(reader.result);
                                reader.readAsDataURL(fontBlob);
                            });

                            embeddedResources.set(originalUrl, base64Font);
                        } catch (e) {
                            logger.log(`Failed to embed resource: ${absoluteUrl}`, e);
                        }
                    }
                    cssText = cssText.replace(urlRegex, (match, originalUrl) => {
                        const embeddedResource = embeddedResources.get(originalUrl);
                        return embeddedResource ? match.replace(originalUrl, embeddedResource) : match;
                    });
                    cssString += cssText;

                } else {
                    cssString += sheet.cssRules ? Array.from(sheet.cssRules).map(rule => rule.cssText).join('') : '';
                }
            } catch (e) {
                logger.log('Error accessing stylesheet', e);
            }
        }
        return cssString;
    }

    function generateStaticHtml(cssContent) {
        // Clone the app zone to manipulate it without affecting the live view
        const appZoneClone = appZoneElement.cloneNode(true);

        // Remove edit/config elements from the clone
        appZoneClone.querySelectorAll('.config-element').forEach(el => el.remove());
        appZoneClone.querySelectorAll('.link-edit').forEach(el => el.remove());
        appZoneClone.querySelectorAll('.drag-handle').forEach(el => el.remove());

        // Remove drop-zones
        appZoneClone.querySelectorAll('.drop-zone').forEach(el => el.remove());

        // In the live app, clicks are intercepted. In static, we want standard behavior.
        // If config says open in new tab, we should add target="_blank" to all links.
        const openInNewTab = configService.get().open_in_new_tab;

        appZoneClone.querySelectorAll('a.link-element').forEach(a => {
            if (openInNewTab) {
                a.setAttribute('target', '_blank');
            } else {
                a.removeAttribute('target');
            }
        });


        const searchScript = `
            <script>
                document.addEventListener('DOMContentLoaded', () => {
                    const searchBar = document.getElementById('search-bar');
                    const links = document.querySelectorAll('li.link');
                    
                    searchBar.addEventListener('input', (e) => {
                        const filterText = e.target.value.toLowerCase();
                        links.forEach(link => {
                           const linkName = link.querySelector('.link-name').innerText.toLowerCase();
                           const linkUrl = link.querySelector('a.link-element')?.getAttribute('href')?.toLowerCase() || '';
                           if (linkName.includes(filterText) || linkUrl.includes(filterText)) {
                               link.style.display = '';
                               // Ensure parent group is visible if it has visible links
                               link.closest('.links-group').style.display = '';
                           } else {
                               link.style.display = 'none';
                           }
                        });
                        
                        // Hide empty groups
                        document.querySelectorAll('.links-group').forEach(group => {
                            const visibleLinks = group.querySelectorAll('li.link:not([style*="display: none"])');
                            if (visibleLinks.length === 0) {
                                group.style.display = 'none';
                            } else {
                                group.style.display = '';
                            }
                        });
                    });
                    
                     searchBar.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            const visibleLink = document.querySelector('li.link:not([style*="display: none"]) a.link-element');
                            if (visibleLink) {
                                visibleLink.click();
                            }
                        }
                    });
                    
                    searchBar.focus();
                });
            </script>
        `;

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(document.title)}</title>
  <style>
    ${cssContent}
    /* Hide configuration related elements that might have slipped through or are controlled by JS */
    .config-element, .link-edit, .drag-handle { display: none !important; }
    #config-button { display: none !important; }
    /* Ensure styles that depend on 'body' classes (theme) work. We need to copy body classes. */
  </style>
</head>
<body class="${esc(document.body.className)}">
    <div id="app">
        <div id="app-zone">
            ${appZoneClone.innerHTML}
        </div>
    </div>
    ${searchScript}
</body>
</html>`;
    }

}
