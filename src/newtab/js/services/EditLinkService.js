import { generateUUID } from '../utils'; 
import { LogService } from './LogService';  

export function EditLinkService() {
    const editLinkDialog = document.getElementById('edit-link-dialog');
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
    const titleElement = document.querySelector('#edit-link-dialog h2');

    const logger = LogService().getLogger();

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

    editLinkSaveButton.addEventListener('click', () => {
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

    editLinkIconFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                link.icon_data = e.target.result;
                link.icon_id = "image:"+generateUUID();
                displayIcon();
            };
            reader.readAsDataURL(file);
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
