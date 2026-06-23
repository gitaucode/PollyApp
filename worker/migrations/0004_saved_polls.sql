PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS saved_polls (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, poll_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_polls_user_created ON saved_polls(user_id, created_at DESC);
