const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 3000;
const SECRET = 'mysecretkey123'; // TODO: move this to .env file

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// middleware to check if user is logged in
function checkLogin(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) {
    return res.status(401).json({ message: 'Please login first' });
  }

  const token = header.split(' ')[1];
  jwt.verify(token, SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

/* ---------------- AUTH ---------------- */

// register
app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  const hashed = bcrypt.hashSync(password, 10);

  db.run(
    'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
    [username, email, hashed],
    function (err) {
      if (err) {
        return res.status(400).json({ message: 'Username or email already exists' });
      }
      res.json({ message: 'Registered successfully' });
    }
  );
});

// login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    if (!user) return res.status(400).json({ message: 'Wrong email or password' });

    const ok = bcrypt.compareSync(password, user.password);
    if (!ok) return res.status(400).json({ message: 'Wrong email or password' });

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '1d' });
    res.json({ token: token, username: user.username, id: user.id });
  });
});

/* ---------------- POSTS ---------------- */

// get all posts
app.get('/api/posts', (req, res) => {
  const sql = `SELECT posts.*, users.username FROM posts
               JOIN users ON posts.user_id = users.id
               ORDER BY posts.id DESC`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    res.json(rows);
  });
});

// get one post
app.get('/api/posts/:id', (req, res) => {
  const sql = `SELECT posts.*, users.username FROM posts
               JOIN users ON posts.user_id = users.id
               WHERE posts.id = ?`;
  db.get(sql, [req.params.id], (err, post) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  });
});

// create post
app.post('/api/posts', checkLogin, (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ message: 'Title and content are required' });
  }

  db.run(
    'INSERT INTO posts (title, content, user_id) VALUES (?, ?, ?)',
    [title, content, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.json({ message: 'Post created', id: this.lastID });
    }
  );
});

// edit post (only the owner can do it)
app.put('/api/posts/:id', checkLogin, (req, res) => {
  const { title, content } = req.body;

  db.get('SELECT * FROM posts WHERE id = ?', [req.params.id], (err, post) => {
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own posts' });
    }

    db.run(
      'UPDATE posts SET title = ?, content = ? WHERE id = ?',
      [title, content, req.params.id],
      function (err2) {
        if (err2) return res.status(500).json({ message: 'Server error' });
        res.json({ message: 'Post updated' });
      }
    );
  });
});

// delete post (only the owner)
app.delete('/api/posts/:id', checkLogin, (req, res) => {
  db.get('SELECT * FROM posts WHERE id = ?', [req.params.id], (err, post) => {
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }

    // delete the comments first and then the post
    db.run('DELETE FROM comments WHERE post_id = ?', [req.params.id], () => {
      db.run('DELETE FROM posts WHERE id = ?', [req.params.id], function (err2) {
        if (err2) return res.status(500).json({ message: 'Server error' });
        res.json({ message: 'Post deleted' });
      });
    });
  });
});

/* ---------------- COMMENTS ---------------- */

// get comments of a post
app.get('/api/posts/:id/comments', (req, res) => {
  const sql = `SELECT comments.*, users.username FROM comments
               JOIN users ON comments.user_id = users.id
               WHERE comments.post_id = ?
               ORDER BY comments.id ASC`;
  db.all(sql, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    res.json(rows);
  });
});

// add comment
app.post('/api/posts/:id/comments', checkLogin, (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ message: 'Comment cannot be empty' });
  }

  db.run(
    'INSERT INTO comments (text, post_id, user_id) VALUES (?, ?, ?)',
    [text, req.params.id, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.json({ message: 'Comment added', id: this.lastID });
    }
  );
});

// delete comment (only the owner)
app.delete('/api/comments/:id', checkLogin, (req, res) => {
  db.get('SELECT * FROM comments WHERE id = ?', [req.params.id], (err, comment) => {
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own comments' });
    }

    db.run('DELETE FROM comments WHERE id = ?', [req.params.id], function (err2) {
      if (err2) return res.status(500).json({ message: 'Server error' });
      res.json({ message: 'Comment deleted' });
    });
  });
});

app.listen(PORT, () => {
  console.log('Server running on http://localhost:' + PORT);
});
