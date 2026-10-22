# Blog Platform with Comments

A simple full-stack blog app with registration, login, posts, and comments.

## Important: run it through Node.js, not VS Code Live Server

The frontend calls `/api/...` endpoints served by Express. Opening `public/index.html`
through Live Server (usually `127.0.0.1:5500`) causes the API request to return an HTML
404 page, which leads to `Unexpected token '<' ... is not valid JSON`.

## Run on Windows

1. Install Node.js (LTS) if it is not installed.
2. Extract this ZIP file.
3. Open the `blog-platform` folder in VS Code.
4. Open **Terminal → New Terminal**. Make sure the terminal is in the folder containing `package.json`.
5. Run:

   ```bash
   npm install
   npm start
   ```

6. Wait for `Server running on http://localhost:3000`.
7. Open **http://localhost:3000** in your browser. Do not click “Go Live” and do not open `public/index.html` directly.

To stop the server, press `Ctrl+C` in the terminal.

## Troubleshooting

- If `npm` is not recognized, install Node.js LTS and restart VS Code.
- If port 3000 is already in use, close the other app using it, then run `npm start` again.
- If the browser still shows an old page, open `http://localhost:3000` and press `Ctrl+F5`.
- If `npm install` fails, copy the complete terminal error for diagnosis.

## Tech stack
- Node.js + Express REST API
- SQLite database
- bcryptjs password hashing
- JWT authentication
- HTML, CSS, JavaScript frontend

## Main API endpoints

| Method | URL | Description |
|---|---|---|
| POST | `/api/register` | Register a user |
| POST | `/api/login` | Log in |
| GET | `/api/posts` | List posts |
| GET | `/api/posts/:id` | Read a post |
| POST | `/api/posts` | Create a post (login required) |
| PUT | `/api/posts/:id` | Edit own post (login required) |
| DELETE | `/api/posts/:id` | Delete own post (login required) |
| GET | `/api/posts/:id/comments` | List comments |
| POST | `/api/posts/:id/comments` | Add comment (login required) |
| DELETE | `/api/comments/:id` | Delete own comment (login required) |
