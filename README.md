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

```bash
npm run dev
```

Opens at http://localhost:5173

Backend runs on http://localhost:3001

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

### Required for Import
- **Summary** - Brief title
- **Description** - Detailed description
- **Test Steps** - At least one step with Action and Expected Result

### Optional
- **Test Type** - Manual (default) or Automated
- **Priority** - High, Medium, Low
- **Labels** - Tags for categorization

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
3. Select "Ready" test cases
4. Click "Import Selected"
5. Post-import modal: delete all or keep as "imported"

## Test Case Status

- **Draft** - Missing required fields, cannot import
- **Ready** - Complete, can be imported
- **Imported** - Successfully imported, kept for reference

## Storage

Each test case is stored as a separate JSON file:

```
testCases/
  {uuid-1}.json
  {uuid-2}.json
  ...
```

Config stored in:
```
config/xray-config.json
```

## File Structure

```
config/              # Xray config (gitignored)
testCases/           # Test case JSON files (gitignored)
server/              # Express backend
  routes/
    config.js        # Config endpoints
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
