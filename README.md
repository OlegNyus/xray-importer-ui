# RayDrop

Web UI for importing test cases to Xray Cloud.

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
   - **Project Key** - Jira project key (uppercase, e.g., `WCP`)

3. Click "Validate & Save Configuration"

## Creating Test Cases

### Summary Format
Summary uses structured format: `Functional Area | UI/API | Title`

Example: `User Management | UI | Verify login with valid credentials`

- **Functional Area** - Select from dropdown or add new
- **Layer** - UI or API toggle
- **Title** - Test case title

### Required for Import
- **Summary** - All three parts (Area, Layer, Title)
- **Description** - Detailed description
- **Test Steps** - At least one step with Action and Expected Result

### Optional
- **Labels** - Select from predefined list or add new

### Fixed Values (for now)
- **Test Type** - Manual
- **Priority** - Medium

### Steps
- Drag to reorder
- Click + to add more
- Each step: Action, Data (optional), Expected Result

## Workflow

### Save Draft
- Save incomplete test cases for later
- Requires at least one field to have content
- Stored as individual JSON files in `/testCases/`

### Import
1. Fill required fields
2. Click "Import to Xray"
3. Test case is saved and imported directly via Xray API
4. Post-import modal: choose to delete or keep locally

### Bulk Import
1. Save multiple test cases as drafts
2. Go to "Saved" tab
3. Select complete drafts (Draft ✓)
4. Click "Import Selected"
5. Post-import modal: delete all or keep as "imported"

## Test Case Status

Only two statuses: `draft` and `imported`

| Badge | Meaning | Can Import |
|-------|---------|------------|
| New | Not saved yet | No |
| Draft | Saved, incomplete | No |
| Draft ✓ | Saved, complete | Yes |
| Imported | In Xray | No (read-only) |

- **Save Draft** → always `status: 'draft'`
- **Completeness** (`isComplete`) computed from required fields
- **Draft ✓** indicates complete and ready to import
- **Import** → sets `status: 'imported'` (read-only)

## Storage

Each test case is stored as a separate JSON file:

```
testCases/
  {uuid-1}.json
  {uuid-2}.json
  ...
```

Config and settings stored in:
```
config/
  xray-config.json   # Xray API credentials (gitignored)
  settings.json      # Functional areas, labels
```

## File Structure

```
config/              # Config files
  xray-config.json   # API credentials (gitignored)
  settings.json      # Functional areas, labels
testCases/           # Test case JSON files (gitignored)
server/              # Express backend
  routes/
    config.js        # Config endpoints
    settings.js      # Functional areas, labels endpoints
    drafts.js        # Draft CRUD + import
  utils/
    fileOperations.js
    xrayClient.js    # Direct Xray API calls
src/                 # React frontend
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/config | Get config (masked credentials) |
| POST | /api/config | Save config |
| GET | /api/settings/functional-areas | Get functional areas |
| PUT | /api/settings/functional-areas | Save functional areas |
| GET | /api/settings/labels | Get labels |
| PUT | /api/settings/labels | Save labels |
| GET | /api/drafts | List all drafts |
| GET | /api/drafts/:id | Get single draft |
| POST | /api/drafts | Create draft |
| PUT | /api/drafts/:id | Update draft |
| DELETE | /api/drafts/:id | Delete draft |
| PATCH | /api/drafts/:id/status | Update status |
| POST | /api/drafts/:id/import | Import single draft |
| POST | /api/drafts/bulk-import | Import multiple drafts |

## Production

```bash
npm run build    # Build frontend
npm start        # Run server on port 3001
```

Single server serves both API and static files.

## Troubleshooting

**Authentication failed**
- Verify Client ID and Client Secret
- Check API key has not expired

**Import failed**
- Check required fields are filled
- Verify project key exists in Jira

**Test cases not in Jira**
- Import is async
- Check Xray Import Jobs for status
- Job ID shown on success screen
