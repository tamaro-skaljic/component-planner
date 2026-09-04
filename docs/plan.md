# UI Component Planner – Implementation Plan

## Goal
Create a mobile-first, single-page web tool in a single `index.html` file that allows creating, renaming, deleting, sorting, filtering, and persisting UI component names.

## Repository location
- Repository: `tamaro-skaljic/ui-component-planner`
- Branch: `main`
- Plan file location: `docs/plan.md`
- Implementation file location: `docs/index.html`

## Functional requirements

### 1. Single-file web app
- Build the project as a single `index.html` file.
- Include HTML, CSS, and JavaScript in that file only.
- No external dependencies.

### 2. Layout
- Dark-mode-only UI.
- Mobile-first layout.
- Full-height page.
- Scrollable content area above.
- Sticky/fixed bottom input bar.
- Input width should approximately match viewport width with margins.

### 3. Input section
Include at the bottom:
- A label: `Component Name`
- A single-line input with identifier `create-or-rename-component`
- Placeholder text inside the input
- A clear (`×`) button
- A small mode-dependent hint label:
  - Create mode: `Type to filter. Press enter to create.`
  - Edit mode: `Press enter to rename.`

### 4. Input constraints and normalization
The input must:
- Allow only `a-z`, `A-Z`, and spaces during typing
- Block invalid characters from being typed
- Sanitize pasted content
- Collapse multiple spaces to a single space
- Trim leading and trailing spaces
- Capitalize the first character of every word and lowercase the rest

Example:
- `bUTTon gROUP` → `Button Group`

### 5. Component list behavior
Components are stored as normalized display names.

Rules:
- No duplicates allowed
- Duplicate checks are case-insensitive and normalization-based
- All of the following are treated as the same value:
  - `item list`
  - `Item   List`
  - `ITEM LIST`

### 6. Create mode
When not editing:
- The input value is also used as the live filter
- Pressing Enter:
  - If input is empty after normalization, do nothing
  - If component already exists, do nothing except clear input
  - Otherwise add a new component
  - Sort all rows alphabetically ascending, case-insensitive
  - Save to `localStorage`
  - Clear input
- Pressing Escape:
  - Clear input
  - Reset filtering

### 7. Filtering
Filtering applies only in create mode.

Rules:
- Case-insensitive
- Split entered input by spaces into words
- Match by substring, not exact whole word
- A row is shown only if its component name contains all entered words
- Word order does not matter

Example:
- Filter input: `List Item`
- Matches:
  - `List Item`
  - `Item List`
  - `Main Item List`

### 8. Edit mode
When the Edit (`E`) button is pressed:
- Put that row's component name into the input
- Select the entire input value automatically
- Highlight the edited row using a brighter color
- Disable filtering while editing
- Change the hint text to `Press enter to rename.`

On Enter in edit mode:
- If input is empty after normalization, do nothing silently
- If normalized value is unchanged:
  - no-op
  - clear input
  - exit edit mode
- If renamed to an already existing component:
  - remove the old component row
  - keep the existing target row
  - clear input
  - exit edit mode
  - save to `localStorage`
- Otherwise:
  - rename the component
  - re-sort alphabetically ascending
  - clear input
  - exit edit mode
  - save to `localStorage`

On Escape in edit mode:
- Clear input
- Cancel edit mode
- Remove highlight

### 9. Delete behavior
The Delete (`D`) button:
- Removes the row immediately
- Saves to `localStorage`
- If the deleted row is currently being edited:
  - clear input
  - exit edit mode

### 10. Table and empty state
Display a normal HTML table when at least one component exists.

Table columns:
- `Component Name`
- `Actions`

If there are no components:
- Do not show the table
- Show centered text:
  - `Use the Input Field below to name the components you'll need to plan!`

### 11. Table rendering details
- Rows always sorted ascending alphabetically, case-insensitive
- Header row has a distinct background color
- Body rows use alternating zebra-striping colors
- Edited row uses a brighter highlight color
- Action buttons shown side by side
- Component name values should be inside a horizontally scrollable area to handle long names on mobile

### 12. Persistence
Use `localStorage` to persist component names.

Behavior:
- Load saved data on startup
- Validate loaded data defensively
- Save after create, rename, and delete operations

### 13. Technical structure
Inside `index.html`:
- Semantic HTML for layout and table
- CSS variables for dark-mode palette
- JavaScript state for:
  - `components`
  - `inputValue`
  - `editingOriginalName`
- Rendering function to rebuild UI from state
- Utility functions for:
  - normalization
  - sorting
  - filtering
  - persistence
  - mode switching

## Implementation steps

### Step 1: Create `docs/index.html`
- Add page shell and viewport meta
- Add app container
- Add empty-state container
- Add table structure
- Add sticky composer/input section

### Step 2: Add dark mobile-first CSS
- Full-height layout
- Scrollable content area
- Sticky bottom bar
- Responsive table styling
- Zebra rows
- Brighter edit highlight
- Horizontally scrollable component-name cell content

### Step 3: Add JavaScript state and persistence
- Initialize state
- Load data from `localStorage`
- Validate/normalize loaded values
- Save helper

### Step 4: Add normalization/input handling
- Keydown blocking for invalid typing
- Paste sanitization
- Input normalization
- Auto-capitalization
- Escape handling
- Clear button behavior

### Step 5: Add create/edit/delete logic
- Create component on Enter in create mode
- Switch to edit mode from `E`
- Rename on Enter in edit mode
- Delete on `D`
- Handle duplicate/no-op cases exactly as specified

### Step 6: Add filtering and rendering
- Filter only in create mode
- Re-render on every relevant state change
- Toggle empty state and table visibility
- Update mode hint and edited row highlight

### Step 7: Final verification
Check:
- mobile readability
- sticky bottom input
- scrollable table area
- alphabetical sorting
- substring word filtering
- duplicate behavior
- edit mode behavior
- localStorage persistence
- empty state behavior

## Notes
- Implementation will be placed in `docs/index.html` on the `main` branch, per request.
- This keeps the plan and implementation together under `docs/`.
