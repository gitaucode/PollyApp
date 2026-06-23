INSERT OR IGNORE INTO users (id, name, handle, avatar_url, bio, is_creator, has_story) VALUES
  ('u0', 'Alex', '@alexvotes', 'https://i.pravatar.cc/150?u=alexvotes', 'Asking unserious questions seriously.', 0, 0),
  ('u1', 'Maya', '@mayaasks', 'https://i.pravatar.cc/150?u=maya', 'Dating polls and soft chaos.', 1, 1),
  ('u2', 'Tyler', '@tylertalks', 'https://i.pravatar.cc/150?u=tyler', 'Friendly arguments only.', 0, 1),
  ('u3', 'Zoe', '@zoepolls', 'https://i.pravatar.cc/150?u=zoe', 'Polls for overthinkers.', 0, 1),
  ('u4', 'Kai', '@kaithinks', 'https://i.pravatar.cc/150?u=kai', 'Random questions, real answers.', 0, 1);

INSERT OR IGNORE INTO polls (id, creator_id, question, category, anonymous, comments_count, shares_count, created_at) VALUES
  ('p1', 'u1', 'Would you date someone your friends dislike?', 'dating', 1, 12, 23, datetime('now', '-2 hours')),
  ('p2', 'u1', 'Which vacation vibe would you choose?', 'random', 1, 18, 27, datetime('now', '-3 hours')),
  ('p3', 'u2', 'Is ghosting ever justified?', 'dating', 1, 7, 14, datetime('now', '-4 hours')),
  ('p4', 'u3', 'Would you rather be rich or famous?', 'money', 1, 16, 31, datetime('now', '-5 hours'));

INSERT OR IGNORE INTO poll_options (id, poll_id, text, emoji, image_url, position, votes_count) VALUES
  ('o1', 'p1', 'Yes, my choice', 'heart', NULL, 1, 49),
  ('o2', 'p1', 'No, friends see things', 'eyes', NULL, 2, 35),
  ('o3', 'p1', 'Depends why', 'thinking', NULL, 3, 26),
  ('o4', 'p1', 'I need more tea', 'tea', NULL, 4, 18),
  ('o5', 'p2', 'Beach escape', '', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80', 1, 94),
  ('o6', 'p2', 'City nights', '', 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=900&q=80', 2, 88),
  ('o7', 'p3', 'Never', 'no', NULL, 1, 31),
  ('o8', 'p3', 'Sometimes', 'spark', NULL, 2, 46),
  ('o9', 'p3', 'Only if unsafe', 'shield', NULL, 3, 19),
  ('o10', 'p4', 'Rich', 'wallet', NULL, 1, 89),
  ('o11', 'p4', 'Famous', 'star', NULL, 2, 64);

INSERT OR IGNORE INTO activity (id, user_id, poll_id, type, title, subtitle, unread, created_at) VALUES
  ('a1', 'u0', 'p1', 'milestone', 'Your poll hit 100 votes!', '"Would you date someone your friends dislike?"', 1, datetime('now', '-1 hours')),
  ('a2', 'u0', 'p3', 'votes', '48 people voted on your poll', '"Is ghosting ever justified?"', 1, datetime('now', '-4 hours'));
