---
description: Restart the frontend development server
---

Restart the frontend development server:

1. Find any running Vite processes on port 5173
2. Kill the existing process if found
3. Navigate to the frontend directory
4. Start the server again using: `npm run dev`
5. Report the new server URL and status

Check for processes using: `lsof -i :5173` or `ps aux | grep vite`
