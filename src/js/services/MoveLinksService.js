import {LogService} from "./LogService";

// Two ways to reorder links, both ending in linksService.moveLink():
//
//   - Drag & drop, mouse only. Touch input never produces dragstart/dragover/drop
//     on any mobile browser, so this path is unreachable with a finger.
//   - Move mode: pick a link up, then click a destination to drop it. This is the
//     path that works on touch, and with the keyboard too. It has two entry
//     points, the handle and the Move action inside the edit dialog.
export function MoveLinksService(configService, linksService) {
    const logger = LogService().getLogger();
    let dragSrcEl;
    let moveSrcEl = null;
    // The link whose edit dialog is open, so the dialog's Move can name a subject.
    let editSrcEl = null;

    const appElement = document.getElementById('app');
    const appZoneElement = document.getElementById('app-zone');
    const moveHintElement = document.getElementById('move-hint');
    const moveCancelElement = document.getElementById('move-cancel');
    const editLinkDialogElement = document.getElementById('edit-link-dialog');
    const editLinkMoveElement = document.getElementById('edit-link-move');

    appZoneElement.addEventListener('dragstart', handleDragStart);
    appZoneElement.addEventListener('dragenter', handleDragEnter);
    appZoneElement.addEventListener('dragover', handleDragOver);
    appZoneElement.addEventListener('dragleave', handleDragLeave);
    appZoneElement.addEventListener('drop', handleDrop);
    appZoneElement.addEventListener('dragend', handleDragEnd);

    // Capture phase: in move mode this click has to win over the per-link listeners
    // that LinksService binds, which would otherwise open the edit dialog.
    appZoneElement.addEventListener('click', handleClick, true);

    moveCancelElement.addEventListener('click', endMove);

    // The handle is easy to miss, and it looks like something you drag. Whoever
    // reaches for the link itself lands in the edit dialog, so the move is offered
    // there too. EditLinkService decides when it is visible; the action is ours.
    editLinkMoveElement.addEventListener('click', (e) => {
        e.preventDefault();
        if (!editSrcEl || !appZoneElement.contains(editSrcEl)) return;

        // Anything typed in the dialog is dropped: this closes without saving.
        editLinkDialogElement.close('move');
        startMove(editSrcEl);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') endMove();
    });

    // A click outside the lists cancels the move, but is left alone otherwise:
    // swallowing it so that the button you just pressed does nothing feels broken.
    document.addEventListener('click', (e) => {
        if (!appZoneElement.contains(e.target)) endMove();
    }, true);

    return {};

    function handleClick(e) {
        if (!configService.isConfigMode()) return;

        const handle = e.target.closest('a.drag-handle');
        const listItem = e.target.closest('li.link');

        if (!moveSrcEl) {
            // Not the handle: the click goes on to open the edit dialog, which
            // offers the move as well and needs to know on what.
            editSrcEl = listItem && !handle ? listItem : null;

            if (!handle || !listItem) return;

            // Also stops the href="#" jump, which on a phone scrolls back to the top.
            e.preventDefault();
            e.stopPropagation();
            startMove(listItem);
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        // Dropping a link on itself is a cancel, and anything that is not a link
        // is not a destination either.
        if (!listItem || listItem === moveSrcEl) {
            endMove();
            return;
        }

        const source = moveSrcEl;
        endMove();

        linksService.moveLink(source.dataset.category, source.dataset.groupidx, source.dataset.linkidx,
            listItem.dataset.category, listItem.dataset.groupidx, listItem.dataset.linkidx);
    }

    function startMove(listItem) {
        moveSrcEl = listItem;
        appElement.classList.add('move-mode');
        listItem.classList.add('moving');
        moveHintElement.hidden = false;

        logger.log(`Move mode started on ${listItem.dataset.category} ${listItem.dataset.groupidx} ${listItem.dataset.linkidx}`);
    }

    function endMove() {
        if (!moveSrcEl) return;

        moveSrcEl.classList.remove('moving');
        moveSrcEl = null;
        appElement.classList.remove('move-mode');
        moveHintElement.hidden = true;
    }

    function handleDragStart(e) {
        if (!configService.isConfigMode()) {
            e.preventDefault(e);
            return;
        }
        if (!e.target.classList.contains('drag-handle')) {
            e.preventDefault(e);
            return;
        }

        const listItem = e.target.closest('li.link');
        if (!listItem) {
            e.preventDefault();
            return;
        }

        // Dragging and move mode are two answers to the same question.
        endMove();

        dragSrcEl = listItem;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setDragImage(dragSrcEl, 0, 0);
    }

    function handleDragEnter(e) {
        if (!configService.isConfigMode()) return;


        const listItem = e.target.closest('li.link');
        if (!listItem || listItem === dragSrcEl) {
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

        const listItem = e.target.closest('li.link');
        if (listItem && !listItem.contains(e.relatedTarget)) {
            listItem.classList.remove('over');
        }
    }

    function handleDrop(e) {
        if (!configService.isConfigMode()) return;

        e.preventDefault();

        const listItem = e.target.closest('li.link');
        if (!listItem || listItem === dragSrcEl) {
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
