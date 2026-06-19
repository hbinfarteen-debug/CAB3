-- D1 schema for the Mutemo / CAB3 anonymous device vote lock, updated for multiple polls.

CREATE TABLE IF NOT EXISTS polls (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  cards TEXT NOT NULL, -- JSON string of cards
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS votes (
  device_hash TEXT NOT NULL,
  poll_id TEXT NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('YES', 'NO')),
  age_group TEXT,
  region TEXT,
  card_choices TEXT, -- JSON: {"1":"keep","2":"amend",...}
  created_at INTEGER NOT NULL,
  PRIMARY KEY (device_hash, poll_id),
  FOREIGN KEY(poll_id) REFERENCES polls(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_votes_poll_id ON votes (poll_id);
CREATE INDEX IF NOT EXISTS idx_votes_age_group ON votes (age_group);
