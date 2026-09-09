const STORAGE_KEY = 'components';

const state = {
    components: {},
    inputValue: '',
    editingOriginalName: null,
    expandedNames: new Set(),
    relate: null,
};

const createOrRenameComponentInput = document.getElementById('create-or-rename-component-input');

function sanitizeInputValue(rawValue) {
    return String(rawValue ?? '')
        .replace(/[^A-Za-z\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^\s+/, '');
}

function formatInputValue(rawValue) {
    const sanitized = sanitizeInputValue(rawValue);
    const hasTrailingSpace = sanitized.endsWith(' ');
    const trimmed = sanitized.trim();

    if (!trimmed) {
        return '';
    }

    const formatted = trimmed
        .split(' ')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

    return hasTrailingSpace ? `${formatted} ` : formatted;
}

function normalizeName(rawValue) {
    const sanitized = formatInputValue(rawValue).trim();

    if (!sanitized) {
        return '';
    }

    return sanitized;
}

function matchesFilter(value, filterText) {
    const normalizedFilter = normalizeName(filterText);
    if (!normalizedFilter) {
        return true;
    }

    const words = normalizedFilter.toLowerCase().split(/\s+/).filter(Boolean);
    const lowerValue = value.toLowerCase();

    return words.every((word) => lowerValue.includes(word));
}
function syncInputValue() {
    if (createOrRenameComponentInput.value !== state.inputValue) {
        createOrRenameComponentInput.value = state.inputValue;
    }
}

const inputModeHint = document.getElementById('input-mode-hint');

function updateHint() {
    if (state.relate) {
        inputModeHint.textContent = 'Type to filter. Press enter to add, or click a name below.';
        return;
    }

    inputModeHint.textContent = state.editingOriginalName
        ? 'Press enter to rename.'
        : 'Type to filter. Press enter to create.';
}

function renderInlineList(label, names, kind, currentName) {
    const wrap = document.createElement('div');
    wrap.className = 'inline-list-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'inline-list-label';
    labelEl.textContent = `${label}:`;
    wrap.appendChild(labelEl);

    const listEl = document.createElement('span');
    listEl.className = 'inline-list';

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'inline-list-add';
    addButton.textContent = '+';
    addButton.setAttribute('aria-label', `Add ${label} to ${currentName}`);
    addButton.dataset.action = 'start-relate';
    addButton.dataset.kind = kind;
    addButton.dataset.name = currentName;
    listEl.appendChild(addButton);

    names.forEach((relatedName) => {
        const item = document.createElement('span');
        item.className = 'inline-list-item';

        const itemText = document.createElement('span');
        itemText.textContent = relatedName;
        item.appendChild(itemText);

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'inline-list-remove';
        removeButton.textContent = '\u00d7';
        removeButton.setAttribute('aria-label', `Remove ${relatedName} from ${label} of ${currentName}`);
        removeButton.dataset.action = 'remove-relation';
        removeButton.dataset.kind = kind;
        removeButton.dataset.name = currentName;
        removeButton.dataset.relatedName = relatedName;
        item.appendChild(removeButton);

        listEl.appendChild(item);
    });

    wrap.appendChild(listEl);
    return wrap;
}

function sortComponents(list) {
    return [...list].sort((left, right) =>
        left.localeCompare(right, undefined, { sensitivity: 'base' })
    );
}

function getVisibleComponents() {
    const allNames = Object.keys(state.components);

    if (state.editingOriginalName) {
        return sortComponents(allNames);
    }

    const filterText = state.inputValue;
    if (!filterText) {
        return sortComponents(allNames);
    }

    return sortComponents(
        allNames.filter((name) => matchesFilter(name, filterText))
    );
}

const componentsTableBody = document.getElementById('components-table-body');

function renderTable() {
    const visible = getVisibleComponents();
    componentsTableBody.innerHTML = '';

    visible.forEach((name) => {
        const row = document.createElement('tr');
        if (state.editingOriginalName === name) {
            row.classList.add('is-editing');
        }

        const entry = state.components[name] ?? { children: [], child_of: [] };
        const isExpanded = state.expandedNames.has(name);

        const nameCell = document.createElement('td');
        nameCell.className = 'name-cell';

        if (state.relate) {
            const isSelf = name === state.relate.name;
            const relateButton = document.createElement('button');
            relateButton.type = 'button';
            relateButton.className = 'relate-name-button';
            relateButton.textContent = name;
            relateButton.dataset.action = 'pick-relate-target';
            relateButton.dataset.name = name;
            if (isSelf) {
                relateButton.disabled = true;
                relateButton.classList.add('relate-name-button-disabled');
                relateButton.setAttribute('aria-label', `${name} (cannot relate to itself)`);
            } else {
                relateButton.setAttribute('aria-label', `Select ${name}`);
            }
            nameCell.appendChild(relateButton);
        } else {
            const accordionHead = document.createElement('div');
            accordionHead.className = 'accordion-head';
            accordionHead.dataset.action = 'toggle-accordion';
            accordionHead.dataset.name = name;
            accordionHead.setAttribute('role', 'button');
            accordionHead.setAttribute('tabindex', '0');
            accordionHead.setAttribute('aria-expanded', String(isExpanded));
            accordionHead.setAttribute('aria-label', `${isExpanded ? 'Collapse' : 'Expand'} ${name}`);

            const arrowEl = document.createElement('span');
            arrowEl.className = 'accordion-arrow';
            arrowEl.textContent = isExpanded ? '🡅' : '🡇';
            arrowEl.setAttribute('aria-hidden', 'true');
            accordionHead.appendChild(arrowEl);

            const nameText = document.createElement('span');
            nameText.className = 'component-name';
            nameText.textContent = name;
            accordionHead.appendChild(nameText);

            nameCell.appendChild(accordionHead);

            const accordionBody = document.createElement('div');
            accordionBody.className = 'accordion-body';
            if (!isExpanded) {
                accordionBody.classList.add('hidden');
            }

            accordionBody.appendChild(
                renderInlineList('Children', entry.children, 'children', name)
            );
            accordionBody.appendChild(document.createElement('br'));
            accordionBody.appendChild(
                renderInlineList('Child of', entry.child_of, 'child_of', name)
            );

            nameCell.appendChild(accordionBody);
        }

        const actionCell = document.createElement('td');
        actionCell.className = 'actions';

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'action-button edit';
        editButton.textContent = 'E';
        editButton.setAttribute('aria-label', `Edit ${name}`);
        editButton.dataset.action = 'edit';
        editButton.dataset.name = name;

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'action-button delete';
        deleteButton.textContent = 'D';
        deleteButton.setAttribute('aria-label', `Delete ${name}`);
        deleteButton.dataset.action = 'delete';
        deleteButton.dataset.name = name;

        actionCell.appendChild(editButton);
        actionCell.appendChild(deleteButton);

        row.appendChild(nameCell);
        row.appendChild(actionCell);
        componentsTableBody.appendChild(row);
    });
}

const componentsTable = document.getElementById('components-table');
const emptyComponentsTable = document.getElementById('empty-components-table');

function render() {
    updateHint();
    syncInputValue();
    renderTable();

    if (Object.keys(state.components).length === 0) {
        componentsTable.classList.add('hidden');
        emptyComponentsTable.classList.remove('hidden');
    } else {
        componentsTable.classList.remove('hidden');
        emptyComponentsTable.classList.add('hidden');
    }
}

function resetInput() {
    state.inputValue = '';
    createOrRenameComponentInput.value = '';
    createOrRenameComponentInput.focus();
}

function exitEditMode() {
    state.editingOriginalName = null;
    resetInput();
    render();
}

function beginEdit(name) {
    state.editingOriginalName = name;
    state.inputValue = name;
    syncInputValue();
    render();
    requestAnimationFrame(() => {
        createOrRenameComponentInput.focus();
        createOrRenameComponentInput.select();
    });
}


function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeRelationArray(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return Array.from(
        new Set(value.map((item) => normalizeName(item)).filter(Boolean))
    );
}

function enforceSymmetry(components) {
    Object.keys(components).forEach((name) => {
        const entry = components[name];

        entry.children.forEach((childName) => {
            const child = components[childName];
            if (child && !child.child_of.includes(name)) {
                child.child_of.push(name);
            }
        });

        entry.child_of.forEach((parentName) => {
            const parent = components[parentName];
            if (parent && !parent.children.includes(name)) {
                parent.children.push(name);
            }
        });
    });
}

function buildComponentsFromParsed(parsed, onError) {
    const result = {};

    Object.keys(parsed).forEach((rawName) => {
        const name = normalizeName(rawName);
        if (!name) {
            onError?.(`Key "${rawName}" is not a valid component name.`);
            return;
        }

        if (!result[name]) {
            result[name] = { children: [], child_of: [] };
        } else {
            onError?.(
                `Key "${rawName}" normalizes to "${name}", which duplicates another entry.`
            );
        }
    });

    Object.entries(parsed).forEach(([rawName, rawValue]) => {
        const name = normalizeName(rawName);
        if (!name) {
            return;
        }

        const value = rawValue ?? {};
        if (!isPlainObject(value)) {
            onError?.(`Value for "${name}" must be an object.`);
            return;
        }

        const children = normalizeRelationArray(value.children).filter((n) => n !== name);
        const childOf = normalizeRelationArray(value.child_of).filter((n) => n !== name);

        children.forEach((childName) => {
            if (!result[name].children.includes(childName)) {
                result[name].children.push(childName);
            }
        });

        childOf.forEach((parentName) => {
            if (!result[name].child_of.includes(parentName)) {
                result[name].child_of.push(parentName);
            }
        });
    });

    Object.keys(result).forEach((name) => {
        const entry = result[name];

        entry.children = entry.children.filter((childName) => {
            if (result[childName]) {
                return true;
            }
            onError?.(`"${name}" references unknown child "${childName}".`);
            return false;
        });

        entry.child_of = entry.child_of.filter((parentName) => {
            if (result[parentName]) {
                return true;
            }
            onError?.(`"${name}" references unknown parent "${parentName}".`);
            return false;
        });
    });

    enforceSymmetry(result);
    return result;
}

//region Save Components

function saveComponents() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.components));
}

//endregion Save Components

//region Component Relationships

function startRelate(kind, name) {
    state.relate = {
        kind,
        name,
        previousInputValue: state.inputValue,
        previousEditingOriginalName: state.editingOriginalName,
    };
    state.editingOriginalName = null;
    state.inputValue = '';
    render();
    requestAnimationFrame(() => {
        createOrRenameComponentInput.focus();
        createOrRenameComponentInput.select();
    });
}

function endRelate() {
    const relate = state.relate;
    state.relate = null;
    state.editingOriginalName = relate.previousEditingOriginalName;
    state.inputValue = relate.previousInputValue;
    syncInputValue();
    render();
    createOrRenameComponentInput.focus();
}

function addRelationship(parentName, childName) {
    if (!parentName || !childName || parentName === childName) {
        return;
    }

    const parent = state.components[parentName];
    const child = state.components[childName];
    if (!parent || !child) {
        return;
    }

    if (!parent.children.includes(childName)) {
        parent.children.push(childName);
    }

    if (!child.child_of.includes(parentName)) {
        child.child_of.push(parentName);
    }
}

function resolveParentChild(kind, name, relatedName) {
    return kind === 'children'
        ? { parentName: name, childName: relatedName }
        : { parentName: relatedName, childName: name };
}

function completeRelate(relatedName) {
    const relate = state.relate;
    if (!relate || relatedName === relate.name) {
        return;
    }

    const { parentName, childName } = resolveParentChild(relate.kind, relate.name, relatedName);
    addRelationship(parentName, childName);
    state.expandedNames.add(relate.name);
    saveComponents();
    endRelate();
}

function cancelRelate() {
    if (!state.relate) {
        return;
    }
    endRelate();
}

function handleRelateEnter() {
    const normalized = normalizeName(state.inputValue);
    if (!normalized) {
        return;
    }

    if (!state.components[normalized]) {
        state.components[normalized] = { children: [], child_of: [] };
    }

    completeRelate(normalized);
}

function removeRelationship(parentName, childName) {
    const parent = state.components[parentName];
    const child = state.components[childName];

    if (parent) {
        parent.children = parent.children.filter((name) => name !== childName);
    }

    if (child) {
        child.child_of = child.child_of.filter((name) => name !== parentName);
    }
}

//endregion Component Relationships

//region Keyboard Handling
{
    function handleKeydown(event) {
        const { key } = event;

        if (key === 'Enter') {
            event.preventDefault();
            if (state.relate) {
                handleRelateEnter();
            } else if (state.editingOriginalName) {
                handleRename();
            } else {
                handleCreate();
            }
            return;
        }

        if (key === 'Escape') {
            event.preventDefault();
            if (state.relate) {
                cancelRelate();
                return;
            }
            if (state.editingOriginalName) {
                state.editingOriginalName = null;
            }
            state.inputValue = '';
            render();
            createOrRenameComponentInput.focus();
            return;
        }

        if (['Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Backspace', 'Delete'].includes(key)) {
            return;
        }

        if (key.length === 1 && !/[a-zA-Z ]/.test(key)) {
            event.preventDefault();
        }
    }

    function handleInput() {
        const selectionStart = createOrRenameComponentInput.selectionStart ?? createOrRenameComponentInput.value.length;
        const selectionEnd = createOrRenameComponentInput.selectionEnd ?? selectionStart;
        const rawValue = createOrRenameComponentInput.value;
        const formatted = formatInputValue(rawValue);

        createOrRenameComponentInput.value = formatted;
        state.inputValue = formatted;
        createOrRenameComponentInput.setSelectionRange(
            formatInputValue(rawValue.slice(0, selectionStart)).length,
            formatInputValue(rawValue.slice(0, selectionEnd)).length
        );

        if (state.editingOriginalName && normalizeName(formatted) === '') {
            exitEditMode();
            return;
        }

        render();
    }

    createOrRenameComponentInput.addEventListener('keydown', handleKeydown);

    createOrRenameComponentInput.addEventListener('input', handleInput);
}
//endregion Keyboard Handling

//region Accordion
function toggleAccordion(name) {
    if (state.expandedNames.has(name)) {
        state.expandedNames.delete(name);
    } else {
        state.expandedNames.add(name);
    }
    render();
}

{
    function expandAll() {
        state.expandedNames = new Set(Object.keys(state.components));
        render();
    }

    function collapseAll() {
        state.expandedNames.clear();
        render();
    }

    document.addEventListener('keydown', (event) => {
        const head = event.target.closest('[data-action="toggle-accordion"]');
        if (!head) {
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleAccordion(head.dataset.name);
        }
    });

    document.getElementById('expand-all-component-table-rows-button').addEventListener('click', expandAll);
    document.getElementById('collapse-all-component-table-rows-button').addEventListener('click', collapseAll);
}
//endregion Accordion

//region Create Components
function handleCreate() {
    const normalized = normalizeName(state.inputValue);
    if (!normalized) {
        return;
    }

    if (state.components[normalized]) {
        state.inputValue = '';
        render();
        createOrRenameComponentInput.focus();
        return;
    }

    state.components[normalized] = { children: [], child_of: [] };
    saveComponents();
    state.inputValue = '';
    render();
    createOrRenameComponentInput.focus();
}
//endregion Create Components

//region Rename Components
function renameReferences(oldName, newName) {
    Object.keys(state.components).forEach((name) => {
        const entry = state.components[name];

        entry.children = Array.from(
            new Set(
                entry.children.map((n) => (n === oldName ? newName : n)).filter(Boolean)
            )
        ).filter((n) => n !== name);

        entry.child_of = Array.from(
            new Set(
                entry.child_of.map((n) => (n === oldName ? newName : n)).filter(Boolean)
            )
        ).filter((n) => n !== name);
    });
}

function handleRename() {
    const normalized = normalizeName(state.inputValue);
    const oldName = state.editingOriginalName;

    if (!normalized) {
        return;
    }

    if (normalized === oldName) {
        state.editingOriginalName = null;
        state.inputValue = '';
        render();
        createOrRenameComponentInput.focus();
        return;
    }

    if (state.components[normalized]) {
        const oldEntry = state.components[oldName];
        const targetEntry = state.components[normalized];

        oldEntry.children.forEach((childName) => {
            if (childName !== normalized && !targetEntry.children.includes(childName)) {
                targetEntry.children.push(childName);
            }
        });

        oldEntry.child_of.forEach((parentName) => {
            if (parentName !== normalized && !targetEntry.child_of.includes(parentName)) {
                targetEntry.child_of.push(parentName);
            }
        });

        delete state.components[oldName];
        renameReferences(oldName, normalized);
        state.editingOriginalName = null;
        state.inputValue = '';
        saveComponents();
        render();
        createOrRenameComponentInput.focus();
        return;
    }

    const entry = state.components[oldName];
    delete state.components[oldName];
    state.components[normalized] = entry;
    renameReferences(oldName, normalized);
    state.editingOriginalName = null;
    state.inputValue = '';
    saveComponents();
    render();
    createOrRenameComponentInput.focus();
}
//endregion Rename Components

//region Delete Components
function removeAllReferences(name) {
    Object.keys(state.components).forEach((otherName) => {
        const entry = state.components[otherName];
        entry.children = entry.children.filter((childName) => childName !== name);
        entry.child_of = entry.child_of.filter((parentName) => parentName !== name);
    });
}

function handleDelete(name) {
    delete state.components[name];
    removeAllReferences(name);
    state.expandedNames.delete(name);

    if (state.editingOriginalName === name) {
        state.editingOriginalName = null;
        state.inputValue = '';
    }

    saveComponents();
    render();
}
//endregion Delete Components

//region Click Handling
document.addEventListener('click', (event) => {
    const actionElement = event.target.closest('[data-action]');
    if (!actionElement) {
        return;
    }

    const { action, name, kind, relatedName } = actionElement.dataset;

    if (action === 'toggle-accordion') {
        toggleAccordion(name);
        return;
    }

    if (action === 'edit') {
        beginEdit(name);
        return;
    }

    if (action === 'delete') {
        handleDelete(name);
        return;
    }

    if (action === 'remove-relation') {
        const { parentName, childName } = resolveParentChild(kind, name, relatedName);
        removeRelationship(parentName, childName);
        saveComponents();
        render();
        return;
    }

    if (action === 'start-relate') {
        startRelate(kind, name);
        return;
    }

    if (action === 'pick-relate-target') {
        completeRelate(name);
    }
});
//endregion Click Handling

//region Clipboard

function copyToClipboard(text) {
    if (navigator.clipboard?.writeText) {
        return navigator.clipboard.writeText(text);
    }

    const tempTextarea = document.createElement('textarea');
    tempTextarea.value = text;
    document.body.appendChild(tempTextarea);
    tempTextarea.select();
    document.execCommand('copy');
    document.body.removeChild(tempTextarea);
    return Promise.resolve();
}

{
    function handlePaste(event) {
        event.preventDefault();
        const pasted = event.clipboardData.getData('text');

        const selectionStart = createOrRenameComponentInput.selectionStart;
        const selectionEnd = createOrRenameComponentInput.selectionEnd;
        const currentValue = createOrRenameComponentInput.value;
        const nextValue =
            currentValue.slice(0, selectionStart) + pasted + currentValue.slice(selectionEnd);
        const nextSelectionValue = currentValue.slice(0, selectionStart) + pasted;

        state.inputValue = formatInputValue(nextValue);
        createOrRenameComponentInput.value = state.inputValue;
        render();
        const caretPosition = formatInputValue(nextSelectionValue).length;
        createOrRenameComponentInput.setSelectionRange(caretPosition, caretPosition);
    }

    createOrRenameComponentInput.addEventListener('paste', handlePaste);
}
//endregion Clipboard

//region Export
{
    const exportComponentsButton = document.getElementById('export-components-button');

    function buildExportData(components) {
        const exportData = {};

        Object.keys(components).forEach((name) => {
            const entry = components[name];
            if (entry.children.length === 0 && entry.child_of.length === 0) {
                exportData[name] = {};
            } else {
                exportData[name] = { children: entry.children, child_of: entry.child_of };
            }
        });

        return exportData;
    }

    exportComponentsButton.addEventListener('click', () => {
        const raw = JSON.stringify(buildExportData(state.components));

        copyToClipboard(raw).then(() => {
            const originalText = exportComponentsButton.textContent;
            exportComponentsButton.textContent = 'Copied!';
            setTimeout(() => {
                exportComponentsButton.textContent = originalText;
            }, 1500);
        });
    });
}
//endregion Export

//region Import
{
    const importComponentsButton = document.getElementById('import-components-button');
    const cancelComponentImportButton = document.getElementById('cancel-components-import-button');
    const componentImportTextarea = document.getElementById('component-import-textarea');
    const componentImportErrorText = document.getElementById('component-import-error-text');

    function showImportError(messages) {
        componentImportErrorText.innerHTML = '';
        const list = document.createElement('ul');

        messages.forEach((message) => {
            const listItem = document.createElement('li');
            listItem.textContent = message;
            list.appendChild(listItem);
        });

        componentImportErrorText.appendChild(list);
        componentImportErrorText.classList.remove('hidden');
    }

    function hideImportError() {
        componentImportErrorText.innerHTML = '';
        componentImportErrorText.classList.add('hidden');
    }

    function openImportArea() {
        componentImportTextarea.value = '';
        componentImportTextarea.classList.remove('hidden');
        cancelComponentImportButton.classList.remove('hidden');
        hideImportError();
        requestAnimationFrame(() => {
            componentImportTextarea.focus();
        });
    }

    function closeImportArea() {
        componentImportTextarea.value = '';
        componentImportTextarea.classList.add('hidden');
        cancelComponentImportButton.classList.add('hidden');
        hideImportError();
    }

    function attemptImport() {
        let parsed;

        try {
            parsed = JSON.parse(componentImportTextarea.value);
        } catch (error) {
            showImportError(['Pasted text is not valid JSON.']);
            return;
        }

        if (!isPlainObject(parsed)) {
            showImportError(['Data must be a JSON object.']);
            return;
        }

        const structureErrors = [];
        const parsedComponents = buildComponentsFromParsed(parsed, (message) => {
            structureErrors.push(message);
        });

        if (structureErrors.length > 0) {
            showImportError(structureErrors);
            return;
        }

        state.components = parsedComponents;
        state.editingOriginalName = null;
        state.inputValue = '';
        state.expandedNames = new Set();
        saveComponents();
        closeImportArea();
        render();
        createOrRenameComponentInput.focus();
    }

    importComponentsButton.addEventListener('click', () => {
        if (componentImportTextarea.classList.contains('hidden')) {
            openImportArea();
            return;
        }

        attemptImport();
    });

    cancelComponentImportButton.addEventListener('click', closeImportArea);
}
//endregion Import

//region Load Components
{
    function loadComponents() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                state.components = {};
                return;
            }

            const parsed = JSON.parse(raw);
            if (!isPlainObject(parsed)) {
                state.components = {};
                return;
            }

            state.components = buildComponentsFromParsed(parsed);
        } catch (error) {
            state.components = {};
        }
    }

    loadComponents();
}
//endregion Load Components

render();

createOrRenameComponentInput.focus();
