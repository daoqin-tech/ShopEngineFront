---
description: Stop the frontend development server
---

Stop the frontend development server:

1. Find running Vite/npm processes on port 5173
2. Kill the processes gracefully
3. Verify the server has stopped
4. Report the status

Check for processes using: `lsof -i :5173` or `ps aux | grep vite`
