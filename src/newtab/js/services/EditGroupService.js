import { generateUUID } from '../utils';

export function EditGroupService() {
    const editGroupDialog = document.getElementById('edit-group-dialog');
    const editGroupNameInput = document.getElementById('edit-group-name');
    const editGroupSaveButton = document.getElementById('edit-group-save');
    const editGroupCancelButton = document.getElementById('edit-group-cancel');
    const editGroupDeleteButton = document.getElementById('edit-group-delete');
    const titleElement = document.querySelector('#edit-group-dialog h2');

    let onClose = null;
    let group = {
        name: "",
        id: null
    };

    editGroupDialog.addEventListener('close', () => {
        if (editGroupDialog.returnValue === "save") {
            onClose("save", {
                id: group.id || generateUUID(),
                name: editGroupNameInput.value.trim()
            });
        } else if (editGroupDialog.returnValue === "delete") {
            onClose("delete", null);
        }
    });

    editGroupCancelButton.addEventListener('click', () => {
        editGroupDialog.close("cancel");
    });

    editGroupDeleteButton.addEventListener('click', () => {
        if (confirm("Are you sure you want to delete this group? (all links will be deleted too)")) {
            editGroupDialog.close("delete");
        }
    });

    editGroupSaveButton.addEventListener('click', () => {
        if (editGroupNameInput.value.trim() === "") {
            alert("Group name cannot be empty.");
            return;
        }
        editGroupDialog.close("save");
    });

    return {
        editGroup: function editGroup(item, onCloseCallback) {
            onClose = onCloseCallback;
            group.name = "";
            group.id = null;
            let editing = (item !== null);
            if (editing) {
                // Copy item to group
                group.name = item.name;
                group.id = item.id;
                titleElement.textContent = "Edit Group"
                if (item.locked) {
                    editGroupDeleteButton.style.display = 'none';    
                } else {
                    editGroupDeleteButton.style.display = 'inline-block';
                }
            } else {
                titleElement.textContent = "New Group"
                editGroupDeleteButton.style.display = 'none';
            }
            editGroupNameInput.value = group.name;
            editGroupDialog.showModal();
        }
    };
}
