import { APP_CONFIG } from '../AppConfig';
import { esc, generateUUID, safeIconData, safeUrl } from '../utils';
import { LogService } from './LogService';

export function ImportExportService(configService, storageService) {
    const appZoneElement = document.getElementById('app-zone');

    const logger = LogService().getLogger();

    return {
        importLinks,
        exportLinks,
        exportHtml
    };

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

    // onImported runs only on the success path, once the imported data is in storage.
    function importLinks(onImported = () => { }) {
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
                                onImported();
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
