import { generateUUID } from '../utils'; 
import { LogService } from './LogService';

import ImageBlobReduce from 'image-blob-reduce';
import {APP_CONFIG} from "../AppConfig";

export function EditLinkService() {
    const editLinkDialog = document.getElementById('edit-link-dialog');
    const editLinkForm = document.getElementById('edit-link-form');
    const editLinkNameInput = document.getElementById('edit-link-name');
    const editLinkUrlInput = document.getElementById('edit-link-url');
    const editLinkSaveButton = document.getElementById('edit-link-save');
    const editLinkCancelButton = document.getElementById('edit-link-cancel');
    const editLinkDeleteButton = document.getElementById('edit-link-delete');
    const editLinkIconFileInput = document.getElementById('edit-link-icon-file');
    const currentIconContainer = document.getElementById('current-icon-container');
    const currentIconPlaceholder = document.getElementById('current-icon-placeholder');
    const currentIconPreview = document.getElementById('current-icon-preview');
    const removeIconButton = document.getElementById('remove-icon-button');
    const findIconLink = document.getElementById('find-icon-link');
    const titleElement = document.querySelector('#edit-link-dialog h2');

    const logger = LogService().getLogger();

    const imageBlobReduce = new ImageBlobReduce({
        pica: ImageBlobReduce.pica({ features: ["js"] })
    });

    let onClose = null;
    let link = { 
        id: null,
        name: "", 
        url: "", 
        icon_id: null, 
        icon_data: null, 
    };

    editLinkDialog.addEventListener('close', () => {
        if (editLinkDialog.returnValue === "save") {
            onClose("save", {
                id: link.id || generateUUID(),
                name: editLinkNameInput.value.trim(),
                url: editLinkUrlInput.value.trim(),
                icon_id: link.icon_id,
                icon_data: link.icon_data
            });
        } else if (editLinkDialog.returnValue === "delete") {
            onClose("delete", null);
        }
    });

    editLinkCancelButton.addEventListener('click', () => {
        editLinkDialog.close("cancel");
    });

    editLinkDeleteButton.addEventListener('click', () => {
        if (confirm("Are you sure you want to delete this link?")) {
            editLinkDialog.close("delete");
        }
    });

    editLinkForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (editLinkNameInput.value.trim() === "") {
            alert("Link name cannot be empty.");
            return;
        }
        if (editLinkUrlInput.value.trim() === "") {
            alert("Link URL cannot be empty.");
            return;
        }
        if (!/^https?:\/\//.test(editLinkUrlInput.value)) {
            alert("Link URL must start with http:// or https://");
            return;
        }
        editLinkDialog.close("save");
    });

    editLinkIconFileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            try {
                const icon = await optimizeIcon(file);
                link.icon_data = await readAsDataUrl(icon);
                link.icon_id = "image:" + generateUUID();
                displayIcon();
            } catch (error) {
                logger.log("Failed to load image.", error);
            }
        } else {
            logger.log("No file selected or file is empty.");                
        }
    });

    removeIconButton.addEventListener('click', (event) => {
        event.preventDefault();
        link.icon_data = null;
        link.icon_id = null;
        displayIcon();
    });

    findIconLink.addEventListener('click', (event) => {
        event.preventDefault();
        let url = "https://dashboardicons.com";
        if (editLinkNameInput.value.trim()) {
            url += "/icons?q="+encodeURIComponent(editLinkNameInput.value.trim());
        }
        window.open(url, "_blank");
    });

    async function optimizeIcon(file) {
        if (file.type === "image/svg+xml") {
            if (__APP_DEBUG__) {
                logger.log("Icon optimization skipped.", {
                    source: getFileDetails(file),
                    selected: "original",
                    reason: "SVG files are preserved."
                });
            }
            return file;
        }

        try {
            const forcedByFormat = file.type === "image/gif";
            const forcedByDimensions = !forcedByFormat && await exceedsSizeLimit(file);
            const converted = await resizeImage(file);
            const useConverted = forcedByFormat || forcedByDimensions || converted.size < file.size;

            if (__APP_DEBUG__) {
                let reason = "Original file is not larger.";
                if (converted.size < file.size) {
                    reason = "Converted file is smaller.";
                }
                if (forcedByDimensions) {
                    reason = `Source exceeds ${APP_CONFIG.FORCE_RESIZE_OVER} pixels.`;
                }
                if (forcedByFormat) {
                    reason = "GIF files are stored as static images.";
                }

                logger.log("Icon optimization completed.", {
                    source: getFileDetails(file),
                    converted: {
                        type: converted.type,
                        size: converted.size
                    },
                    selected: useConverted ? "converted" : "original",
                    reason
                });
            }

            return useConverted ? converted : file;
        } catch (error) {
            if (__APP_DEBUG__) {
                logger.log("Image optimization failed; using the original file.", {
                    source: getFileDetails(file),
                    error
                });
            }
            return file;
        }
    }

    function getFileDetails(file) {
        return {
            name: file.name,
            type: file.type,
            size: file.size
        };
    }

    async function exceedsSizeLimit(file) {
        const image = await createImageBitmap(file);
        try {
            return Math.max(image.width, image.height) > APP_CONFIG.FORCE_RESIZE_OVER;
        } finally {
            image.close();
        }
    }

    async function resizeImage(file) {
        const canvas = await imageBlobReduce.toCanvas(file, {
            max: APP_CONFIG.RESIZE_TO
        });

        try {
            const blob = await imageBlobReduce.pica.toBlob(canvas, "image/webp", 0.8);
            if (!blob || blob.size === 0 || !blob.type.startsWith("image/")) {
                throw new Error("Image conversion produced an invalid blob.");
            }
            return blob;
        } finally {
            canvas.width = 0;
            canvas.height = 0;
        }
    }

    function readAsDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    }

    function displayIcon() {
        if (link.icon_data) {
            currentIconContainer.style.display = 'block';
            currentIconPlaceholder.style.display = 'none';
            currentIconPreview.src = link.icon_data;
        } else {
            currentIconContainer.style.display = 'none';
            currentIconPlaceholder.style.display = 'block';
        }
    }


    return {
        editLink: function editLink(item, onCloseCallback) {                
            onClose = onCloseCallback;

            link.id = null;
            link.name = "";
            link.url = "";
            link.icon_id = null;
            link.icon_data = null;

            let editing = (item !== null);                

            if (editing) {
                // Copy item to link
                link.id = item.id;
                link.name = item.name;
                link.url = item.url;
                link.icon_id = item.icon_id;
                link.icon_data = item.icon_data;

                editLinkDeleteButton.style.display = 'inline-block';
                titleElement.textContent = "Edit Link";
            } else {
                editLinkDeleteButton.style.display = 'none';
                titleElement.textContent = "New Link";
            }

            editLinkNameInput.value = link.name;
            editLinkUrlInput.value = link.url;
            editLinkIconFileInput.value = '';

            displayIcon();

            editLinkDialog.showModal();
        }
    };
}
