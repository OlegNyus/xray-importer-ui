# RayDrop

Web UI for importing test cases to Xray Cloud.

![Create Test Case](docs/screenshots/create-test-case.png)

## Requirements

- Node.js 18+
- Xray Cloud API credentials (Client ID & Secret)
- Jira Cloud project with Xray installed

## Installation

```bash
npm install
```

## Usage

**Development:**
```bash
npm run dev
```
Frontend: http://localhost:5173 (hot reload)
Backend: http://localhost:3001

**Production:**
```bash
npm run build && npm start
```
App: http://localhost:3001

## Setup

1. Get Xray Cloud API credentials:
   - Jira → Apps → Xray → Settings → API Keys
   - Create API key, copy Client ID and Client Secret

2. Fill in Setup form:
   - **Client ID** - Xray API Client ID
   - **Client Secret** - Xray API Client Secret
   - **Jira Base URL** - e.g., `https://yourcompany.atlassian.net/`

3. Click "Validate & Save Configuration"

## Projects

Manage multiple Jira projects from Settings → Projects.

- **Add Project** - Enter project key (e.g., `WCP`)
- **Switch Project** - Click project card to make it active
- **Hide/Show** - Hide projects you don't need, unhide later
- Each project has its own functional areas, labels, and collections
- Test cases are filtered by active project

## Creating Test Cases

### Summary Format
Summary uses structured format: `Functional Area | Layer | Title`

Example: `User Management | UI | Verify login with valid credentials`

- **Functional Area** - Select from dropdown or add new
- **Layer** - UI or API
- **Title** - Test case title

### Required Fields
- **Summary** - Area, Layer, and Title
- **Description** - Detailed description
- **Test Steps** - At least one step with Action and Expected Result
- **Xray Linking** - At least one Test Plan, Test Execution, and Test Set

### Optional
- **Labels** - Select from predefined list or add new
- **Collection** - Organize test cases into groups
- **Preconditions** - Link existing preconditions from Xray
- **Folder** - Place test in specific Xray folder

### Test Steps
- Drag to reorder
- Click + to add more
- Each step: Action, Data (optional), Expected Result

## Xray Linking

Link test cases to Xray entities before import:

| Entity | Required | Description |
|--------|----------|-------------|
| Test Plans | Yes | One or more test plans |
| Test Executions | Yes | One or more test executions |
| Test Sets | Yes | One or more test sets |
| Folder | Yes | Folder path (default: root `/`) |
| Preconditions | No | Link existing preconditions |

Click "Refresh" to load available entities from Xray Cloud.

## Collections

Organize test cases into collections (e.g., Sprint 1, Smoke Tests).

- Create collections from Collections tab or inline in form
- Each collection has a name and color
- Cannot delete collections that contain test cases

## Workflow

### Save Draft
- Save incomplete test cases for later
- Stored as individual JSON files in `/testCases/`

### Import
1. Fill required fields including Xray linking
2. Click "Import to Xray"
3. Test case created in Jira and linked to selected entities
4. Post-import modal: choose to delete or keep locally

### Bulk Import
1. Save multiple test cases as drafts
2. Go to "Drafts" tab
3. Select complete drafts (Draft ✓)
4. Click "Import Selected"
5. Post-import modal: delete all or keep as "imported"

## Test Case Status

| Badge | Meaning | Can Import |
|-------|---------|------------|
| New | Not saved yet | No |
| Draft | Saved, incomplete | No |
| Draft ✓ | Saved, complete | Yes |
| Imported | In Xray | No |

## Imported Test Cases

Imported test cases appear in the "Imported" tab.

- **View** - Click to see preview with all details
- **Jira Link** - Click test key badge (e.g., WCP-9172) to open in Jira
- **Edit Links** - Add/remove Test Plans, Executions, Sets, Preconditions
- **Select** - Checkbox to select individual or all
- **Delete** - Remove selected from local storage (does not delete from Jira)

### Edit Xray Links

For imported test cases, you can modify Xray associations:

1. Click on imported test case to view
2. Click "Edit Links" button
3. Select/deselect Test Plans, Executions, Sets, Preconditions
4. Click "Save Changes"

Changes are synced to Xray Cloud. The test case is not duplicated.

## Storage

Test cases stored as separate JSON files:
```
testCases/
  {uuid-1}.json
  {uuid-2}.json
```

Config and settings:
```
config/
  xray-config.json   # API credentials (gitignored)
  settings.json      # Projects, functional areas, labels, collections
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/config | Get config |
| POST | /api/config | Save config |
| GET | /api/settings/projects | Get all projects |
| POST | /api/settings/projects | Add project |
| POST | /api/settings/projects/:key/activate | Set active project |
| GET | /api/settings/functional-areas | Get functional areas |
| PUT | /api/settings/functional-areas | Save functional areas |
| GET | /api/settings/labels | Get labels |
| PUT | /api/settings/labels | Save labels |
| GET | /api/settings/collections | Get collections |
| POST | /api/settings/collections | Create collection |
| DELETE | /api/settings/collections/:id | Delete collection |
| GET | /api/drafts | List all drafts |
| GET | /api/drafts/:id | Get single draft |
| POST | /api/drafts | Create draft |
| PUT | /api/drafts/:id | Update draft |
| DELETE | /api/drafts/:id | Delete draft |
| PATCH | /api/drafts/:id/status | Update status |
| PATCH | /api/drafts/:id/xray-links | Update Xray links |
| POST | /api/drafts/:id/import | Import single draft |
| POST | /api/drafts/bulk-import | Import multiple drafts |
| GET | /api/xray/test-plans/:projectKey | Get test plans |
| GET | /api/xray/test-executions/:projectKey | Get test executions |
| GET | /api/xray/test-sets/:projectKey | Get test sets |
| GET | /api/xray/preconditions/:projectKey | Get preconditions |
| GET | /api/xray/folders/:projectKey | Get folder structure |
| POST | /api/xray/link | Link test to entities |
| POST | /api/xray/update-links | Update links (add/remove) |

Interactive API docs: `/api-docs`

## Testing

```bash
npm test              # Run tests
npm run test:coverage # Coverage report
```

## Troubleshooting

**Authentication failed**
- Verify Client ID and Client Secret
- Check API key has not expired

**Import failed**
- Check all required fields including Xray linking
- Verify project key exists in Jira

**Xray entities not loading**
- Click "Refresh" button in Xray Linking section
- Check Xray API credentials are valid
