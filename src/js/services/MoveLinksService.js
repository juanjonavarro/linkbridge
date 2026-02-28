import {LogService} from "./LogService";

export function MoveLinksService(configService, linksService) {
    const logger = LogService().getLogger();
    let dragSrcEl;

    const appZoneElement = document.getElementById('app-zone');

    appZoneElement.addEventListener('dragstart', handleDragStart);
    appZoneElement.addEventListener('dragenter', handleDragEnter);
    appZoneElement.addEventListener('dragover', handleDragOver);
    appZoneElement.addEventListener('dragleave', handleDragLeave);
    appZoneElement.addEventListener('drop', handleDrop);
    appZoneElement.addEventListener('dragend', handleDragEnd);

    return {};

    function handleDragStart(e) {
        if (!configService.isConfigMode()) {
            e.preventDefault(e);
            return;
        }
        if (!e.target.classList.contains('drag-handle')) {
            e.preventDefault(e);
            return;
        }

        const listItem = e.target.closest('li');
        if (!listItem || !listItem.classList.contains('link')) {
            e.preventDefault();
            return;
        }

        dragSrcEl = listItem;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setDragImage(dragSrcEl, 0, 0);
    }

    function handleDragEnter(e) {
        if (!configService.isConfigMode()) return;


        const listItem = e.target.closest('li');
        if (!listItem || !listItem.classList.contains('link') || listItem === dragSrcEl) {
            e.preventDefault();
            return;
        }

        listItem.classList.add('over');
    }

    function handleDragOver(e) {
        if (!configService.isConfigMode()) return;

        e.preventDefault();

        e.dataTransfer.dropEffect = 'move';
    }

    function handleDragLeave(e) {
        if (!configService.isConfigMode()) return;

        const listItem = e.target.closest('li');
        if (listItem && !listItem.contains(e.relatedTarget)) {
            listItem.classList.remove('over');
        }
    }

    function handleDrop(e) {
        if (!configService.isConfigMode()) return;

        e.preventDefault();

        const listItem = e.target.closest('li');
        if (!listItem || !listItem.classList.contains('link') || listItem === dragSrcEl) {
            return;
        }

        listItem.classList.remove('over');

        linksService.moveLink(dragSrcEl.dataset.category, dragSrcEl.dataset.groupidx, dragSrcEl.dataset.linkidx,
            listItem.dataset.category, listItem.dataset.groupidx, listItem.dataset.linkidx);
    }

    function handleDragEnd(e) {
        if (!configService.isConfigMode()) return;

        dragSrcEl = null;
    }

}