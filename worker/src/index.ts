import {
  getBearerToken,
  hashPassword,
  isValidEmail,
  signToken,
  verifyPassword,
  verifyToken,
  type AuthUser,
} from './auth';

export interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  PUBLIC_MEDIA_BASE_URL?: string;
  JWT_SECRET: string;
}

type JsonValue = Record<string, unknown> | unknown[];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

const json = (body: JsonValue, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders,
      ...init.headers,
    },
  });

const notFound = () => json({ error: 'Not found' }, { status: 404 });

const unauthorized = (message = 'Unauthorized') => json({ error: message }, { status: 401 });

const createId = (prefix: string) =>
  `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 18)}`;

async function requireAuth(request: Request, env: Env): Promise<AuthUser | Response> {
  const token = getBearerToken(request);
  if (!token) return unauthorized();

  try {
    return await verifyToken(token, env.JWT_SECRET);
  } catch {
    return unauthorized('Invalid or expired token');
  }
}

function uniqueHandleFromEmail(email: string) {
  const local = email.split('@')[0]?.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'user';
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 4);
  return `@${local}_${suffix}`;
}

async function buildAuthResponse(env: Env, userId: string, email: string) {
  const user = await env.DB.prepare(
    `SELECT u.id, u.name, u.handle, u.avatar_url AS avatar, u.bio,
            u.is_creator AS isCreator, u.has_story AS hasStory,
            COUNT(p.id) AS pollCount
     FROM users u
     LEFT JOIN polls p ON p.creator_id = u.id
     WHERE u.id = ?
     GROUP BY u.id`,
  )
    .bind(userId)
    .first();

  if (!user) return notFound();

  const counts = await env.DB.prepare(
    `SELECT
      (SELECT COUNT(*) FROM follows WHERE following_id = ?) AS followers,
      (SELECT COUNT(*) FROM follows WHERE follower_id = ?) AS following`,
  )
    .bind(userId, userId)
    .first();

  const token = await signToken(userId, email, env.JWT_SECRET);

  return json({
    token,
    user: {
      id: user.id,
      email,
      name: user.name,
      handle: user.handle,
      avatar: user.avatar,
      bio: user.bio || '',
      isCreator: Boolean(user.isCreator),
      hasStory: Boolean(user.hasStory),
      polls: Number(user.pollCount),
      followers: Number(counts?.followers ?? 0),
      following: Number(counts?.following ?? 0),
    },
  });
}

async function registerAccount(env: Env, request: Request) {
  const body = (await request.json()) as { email?: string; password?: string; name?: string };
  const email = body.email?.trim().toLowerCase() ?? '';
  const password = body.password ?? '';
  const name = body.name?.trim() ?? '';

  if (!isValidEmail(email)) {
    return json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  if (password.length < 8) {
    return json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }
  if (!name || name.length > 30) {
    return json({ error: 'Name must be 1-30 characters.' }, { status: 400 });
  }

  const existing = await env.DB.prepare('SELECT id FROM auth_accounts WHERE email = ?').bind(email).first();
  if (existing) {
    return json({ error: 'An account with this email already exists.' }, { status: 409 });
  }

  const userId = createId('u');
  const authId = createId('auth');
  const handle = uniqueHandleFromEmail(email);
  const avatar = `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`;
  const passwordHash = await hashPassword(password);

  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO users (id, name, handle, avatar_url, bio, is_creator, has_story) VALUES (?, ?, ?, ?, ?, 0, 0)',
    ).bind(userId, name, handle, avatar, ''),
    env.DB.prepare(
      'INSERT INTO auth_accounts (id, user_id, email, password_hash) VALUES (?, ?, ?, ?)',
    ).bind(authId, userId, email, passwordHash),
  ]);

  return buildAuthResponse(env, userId, email);
}

async function loginAccount(env: Env, request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase() ?? '';
  const password = body.password ?? '';

  if (!isValidEmail(email) || !password) {
    return json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const account = await env.DB.prepare(
    'SELECT user_id, password_hash FROM auth_accounts WHERE email = ?',
  )
    .bind(email)
    .first();

  if (!account) {
    return json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const valid = await verifyPassword(password, String(account.password_hash));
  if (!valid) {
    return json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  return buildAuthResponse(env, String(account.user_id), email);
}

async function getAuthMe(env: Env, request: Request) {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  return buildAuthResponse(env, auth.userId, auth.email);
}

const timeAgo = (createdAt: string) => {
  const created = Date.parse(`${createdAt.replace(' ', 'T')}Z`);
  const diff = Math.max(0, Date.now() - created);
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

async function getPolls(env: Env, request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const search = url.searchParams.get('search')?.trim();
  const mode = url.searchParams.get('mode');
  const viewerId = url.searchParams.get('userId');
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 50);

  const where: string[] = [];
  const binds: unknown[] = [];
  if (category && category !== 'all') {
    if (category === 'hot-takes') {
      where.push('(p.category = ? OR p.category = ?)');
      binds.push('hot-takes', 'hot-take');
    } else {
      where.push('p.category = ?');
      binds.push(category);
    }
  }
  if (search) {
    where.push('(p.question LIKE ? OR u.name LIKE ? OR u.handle LIKE ?)');
    binds.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (mode === 'following') {
    if (!viewerId) {
      return json({ error: 'userId is required for following feed.' }, { status: 400 });
    }
    where.push('p.creator_id IN (SELECT following_id FROM follows WHERE follower_id = ?)');
    binds.push(viewerId);
  }

  const pollRows = await env.DB.prepare(
    `
    SELECT
      p.id, p.question, p.category, p.anonymous, p.comments_count, p.shares_count, p.created_at,
      u.id AS creator_id, u.name AS creator_name, u.handle AS creator_handle,
      u.avatar_url AS creator_avatar, u.is_creator, u.has_story,
      COALESCE(SUM(o.votes_count), 0) AS votes_count
    FROM polls p
    JOIN users u ON u.id = p.creator_id
    LEFT JOIN poll_options o ON o.poll_id = p.id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT ?
    `,
  )
    .bind(...binds, limit)
    .all();

  const ids = pollRows.results.map((row) => String(row.id));
  const optionRows = ids.length
    ? await env.DB.prepare(
        `SELECT * FROM poll_options WHERE poll_id IN (${ids.map(() => '?').join(',')}) ORDER BY poll_id, position`,
      )
        .bind(...ids)
        .all()
    : { results: [] };

  const optionsByPoll = new Map<string, unknown[]>();
  optionRows.results.forEach((option) => {
    const pollId = String(option.poll_id);
    const list = optionsByPoll.get(pollId) ?? [];
    list.push({
      id: option.id,
      text: option.text,
      emoji: option.emoji,
      imageUrl: option.image_url,
      votes: option.votes_count,
    });
    optionsByPoll.set(pollId, list);
  });

  const polls = pollRows.results.map((row) => ({
    id: row.id,
    question: row.question,
    category: row.category,
    anonymous: Boolean(row.anonymous),
    timeAgo: timeAgo(String(row.created_at)),
    votes: Number(row.votes_count),
    comments: Number(row.comments_count),
    shares: Number(row.shares_count),
    creator: {
      id: row.creator_id,
      name: row.creator_name,
      handle: row.creator_handle,
      avatar: row.creator_avatar,
      isCreator: Boolean(row.is_creator),
      hasStory: Boolean(row.has_story),
    },
    options: optionsByPoll.get(String(row.id)) ?? [],
  }));

  const stories = await env.DB.prepare(
    'SELECT id, name, handle, avatar_url AS avatar, has_story AS hasStory, is_creator AS isCreator FROM users WHERE has_story = 1 ORDER BY created_at ASC LIMIT 12',
  ).all();

  const creators = await env.DB.prepare(
    `
    SELECT u.id, u.name, u.handle, u.avatar_url AS avatar, COUNT(p.id) AS polls
    FROM users u
    LEFT JOIN polls p ON p.creator_id = u.id
    GROUP BY u.id
    ORDER BY polls DESC, u.created_at ASC
    LIMIT 12
    `,
  ).all();

  let creatorResults = creators.results;
  if (viewerId) {
    const followRows = await env.DB.prepare(
      'SELECT following_id FROM follows WHERE follower_id = ?',
    )
      .bind(viewerId)
      .all();
    const followingSet = new Set(followRows.results.map((row) => String(row.following_id)));
    creatorResults = creatorResults.map((creator) => ({
      ...creator,
      isFollowing: followingSet.has(String(creator.id)),
    }));
  }

  return json({ polls, stories: stories.results, creators: creatorResults });
}

async function getPoll(env: Env, id: string, request?: Request) {
  const row = await env.DB.prepare(
    `
    SELECT
      p.id, p.question, p.category, p.anonymous, p.comments_count, p.shares_count, p.created_at,
      u.id AS creator_id, u.name AS creator_name, u.handle AS creator_handle,
      u.avatar_url AS creator_avatar, u.is_creator,
      COALESCE(SUM(o.votes_count), 0) AS votes_count
    FROM polls p
    JOIN users u ON u.id = p.creator_id
    LEFT JOIN poll_options o ON o.poll_id = p.id
    WHERE p.id = ?
    GROUP BY p.id
    `,
  )
    .bind(id)
    .first();

  if (!row) return notFound();

  const options = await env.DB.prepare(
    'SELECT id, text, emoji, image_url AS imageUrl, votes_count AS votes FROM poll_options WHERE poll_id = ? ORDER BY position',
  )
    .bind(id)
    .all();

  const totalVotes = Number(row.votes_count);

  let isSaved = false;
  if (request) {
    const token = getBearerToken(request);
    if (token) {
      try {
        const auth = await verifyToken(token, env.JWT_SECRET);
        const savedRow = await env.DB.prepare(
          'SELECT 1 FROM saved_polls WHERE user_id = ? AND poll_id = ?',
        )
          .bind(auth.userId, id)
          .first();
        isSaved = Boolean(savedRow);
      } catch {
        // ignore invalid tokens for public poll reads
      }
    }
  }

  return json({
    poll: {
      id: row.id,
      question: row.question,
      category: row.category,
      anonymous: Boolean(row.anonymous),
      timeAgo: timeAgo(String(row.created_at)),
      votes: totalVotes,
      comments: Number(row.comments_count),
      shares: Number(row.shares_count),
      isSaved,
      creator: {
        id: row.creator_id,
        name: row.creator_name,
        handle: row.creator_handle,
        avatar: row.creator_avatar,
        isCreator: Boolean(row.is_creator),
      },
      options: options.results.map((option) => ({
        ...option,
        percentage: totalVotes ? Math.round((Number(option.votes) / totalVotes) * 100) : 0,
      })),
    },
  });
}

async function createPoll(env: Env, request: Request) {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const body = (await request.json()) as {
    question?: string;
    category?: string;
    anonymous?: boolean;
    creatorId?: string;
    options?: { text?: string; emoji?: string; imageUrl?: string }[];
  };

  const question = body.question?.trim();
  const options = (body.options ?? []).map((option) => ({
    text: option.text?.trim() ?? '',
    emoji: option.emoji?.trim() ?? '',
    imageUrl: option.imageUrl?.trim() || null,
  })).filter((option) => option.text.length > 0);

  if (!question || question.length > 140) {
    return json({ error: 'Question must be 1-140 characters.' }, { status: 400 });
  }
  if (options.length < 2 || options.length > 6) {
    return json({ error: 'Polls need 2-6 answer options.' }, { status: 400 });
  }

  const pollId = createId('poll');
  const creatorId = auth.userId;

  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO polls (id, creator_id, question, category, anonymous) VALUES (?, ?, ?, ?, ?)',
    ).bind(pollId, creatorId, question, body.category || 'random', body.anonymous === false ? 0 : 1),
    ...options.map((option, index) =>
      env.DB.prepare(
        'INSERT INTO poll_options (id, poll_id, text, emoji, image_url, position) VALUES (?, ?, ?, ?, ?, ?)',
      ).bind(createId('opt'), pollId, option.text, option.emoji, option.imageUrl, index + 1),
    ),
  ]);

  return getPoll(env, pollId, request);
}

async function vote(env: Env, request: Request, pollId: string) {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const body = (await request.json()) as { optionId?: string; voterKey?: string };
  if (!body.optionId) {
    return json({ error: 'optionId is required.' }, { status: 400 });
  }

  const voterKey = `user:${auth.userId}`;

  const option = await env.DB.prepare('SELECT id FROM poll_options WHERE id = ? AND poll_id = ?')
    .bind(body.optionId, pollId)
    .first();
  if (!option) return json({ error: 'Option does not belong to this poll.' }, { status: 400 });

  const voteId = createId('vote');
  const inserted = await env.DB.prepare(
    'INSERT OR IGNORE INTO votes (id, poll_id, option_id, voter_key) VALUES (?, ?, ?, ?)',
  )
    .bind(voteId, pollId, body.optionId, voterKey)
    .run();

  if (inserted.meta.changes > 0) {
    await env.DB.prepare('UPDATE poll_options SET votes_count = votes_count + 1 WHERE id = ?')
      .bind(body.optionId)
      .run();

    // Get poll creator ID to create activity
    const poll = await env.DB.prepare('SELECT creator_id FROM polls WHERE id = ?')
      .bind(pollId)
      .first();

    if (poll) {
      const activityId = createId('act');
      await env.DB.prepare(
        'INSERT INTO activity (id, user_id, poll_id, type, title, subtitle, unread, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))',
      )
        .bind(
          activityId,
          poll.creator_id,
          pollId,
          'votes',
          'New vote on your poll',
          'Someone just voted on your poll',
          1,
        )
        .run();
    }
  }

  const response = await getPoll(env, pollId, request);
  const payload = (await response.json()) as Record<string, unknown>;
  return json({ ...payload, accepted: inserted.meta.changes > 0 });
}

async function uploadMedia(env: Env, request: Request) {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const body = (await request.json()) as { filename?: string; contentType?: string; base64?: string };
  if (!body.base64 || !body.contentType) {
    return json({ error: 'base64 and contentType are required.' }, { status: 400 });
  }

  const extension = body.filename?.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'bin';
  const key = `poll-options/${crypto.randomUUID()}.${extension}`;
  const bytes = Uint8Array.from(atob(body.base64), (char) => char.charCodeAt(0));

  await env.MEDIA.put(key, bytes, {
    httpMetadata: { contentType: body.contentType },
  });

  const baseUrl = env.PUBLIC_MEDIA_BASE_URL || new URL(request.url).origin;
  return json({ key, url: `${baseUrl.replace(/\/$/, '')}/media/${key}` });
}

async function getMedia(env: Env, key: string) {
  const object = await env.MEDIA.get(key);
  if (!object) return notFound();
  return new Response(object.body, {
    headers: {
      ...corsHeaders,
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

async function getUser(env: Env, request: Request, id: string) {
  const user = await env.DB.prepare(
    `SELECT u.id, u.name, u.handle, u.avatar_url AS avatar, u.bio,
            u.is_creator AS isCreator, u.has_story AS hasStory,
            COUNT(p.id) AS pollCount
     FROM users u
     LEFT JOIN polls p ON p.creator_id = u.id
     WHERE u.id = ?
     GROUP BY u.id`,
  )
    .bind(id)
    .first();
  if (!user) return notFound();

  const counts = await env.DB.prepare(
    `SELECT
      (SELECT COUNT(*) FROM follows WHERE following_id = ?) AS followers,
      (SELECT COUNT(*) FROM follows WHERE follower_id = ?) AS following`,
  )
    .bind(id, id)
    .first();

  let isFollowing = false;
  const token = getBearerToken(request);
  if (token) {
    try {
      const auth = await verifyToken(token, env.JWT_SECRET);
      if (auth.userId !== id) {
        const followRow = await env.DB.prepare(
          'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?',
        )
          .bind(auth.userId, id)
          .first();
        isFollowing = Boolean(followRow);
      }
    } catch {
      // ignore invalid tokens for public profile reads
    }
  }

  return json({
    user: {
      id: user.id,
      name: user.name,
      handle: user.handle,
      avatar: user.avatar,
      bio: user.bio || '',
      isCreator: Boolean(user.isCreator),
      hasStory: Boolean(user.hasStory),
      polls: Number(user.pollCount),
      followers: Number(counts?.followers ?? 0),
      following: Number(counts?.following ?? 0),
      isFollowing,
    },
  });
}

async function getUserPolls(env: Env, userId: string) {
  const pollRows = await env.DB.prepare(
    `SELECT p.id, p.question, p.category, p.created_at,
            COALESCE(SUM(o.votes_count), 0) AS votes_count
     FROM polls p
     LEFT JOIN poll_options o ON o.poll_id = p.id
     WHERE p.creator_id = ?
     GROUP BY p.id
     ORDER BY p.created_at DESC
     LIMIT 50`,
  )
    .bind(userId)
    .all();

  const polls = pollRows.results.map((row) => ({
    id: row.id,
    question: row.question,
    category: row.category,
    timeAgo: timeAgo(String(row.created_at)),
    votes: Number(row.votes_count),
  }));
  return json({ polls });
}

async function getActivity(env: Env, request: Request, userId: string) {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  if (auth.userId !== userId) return unauthorized();

  const rows = await env.DB.prepare(
    `SELECT id, type, title, subtitle, unread, created_at, poll_id AS pollId
     FROM activity
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 50`,
  )
    .bind(userId)
    .all();

  const items = rows.results.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    subtitle: row.subtitle,
    unread: Boolean(row.unread),
    timeAgo: timeAgo(String(row.created_at)),
    pollId: row.pollId ? String(row.pollId) : null,
  }));
  return json({ activity: items });
}

async function registerDevice(env: Env, request: Request) {
  const body = (await request.json()) as { deviceId?: string };
  const deviceId = body.deviceId?.trim();
  if (!deviceId || deviceId.length > 128) {
    return json({ error: 'deviceId is required.' }, { status: 400 });
  }

  const existing = await env.DB.prepare('SELECT user_id FROM device_sessions WHERE device_id = ?')
    .bind(deviceId)
    .first();

  if (existing) {
    return json({ userId: String(existing.user_id), isNew: false });
  }

  const userId = createId('u');
  const suffix = deviceId.replace(/[^a-zA-Z0-9]/g, '').slice(-8) || userId.slice(-8);
  const handle = `@user_${suffix}`;
  const avatar = `https://i.pravatar.cc/150?u=${encodeURIComponent(deviceId)}`;

  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO users (id, name, handle, avatar_url, bio, is_creator, has_story) VALUES (?, ?, ?, ?, ?, 0, 0)',
    ).bind(userId, 'New voter', handle, avatar, ''),
    env.DB.prepare('INSERT INTO device_sessions (device_id, user_id) VALUES (?, ?)').bind(deviceId, userId),
  ]);

  return json({ userId, isNew: true });
}

async function toggleFollow(env: Env, request: Request, creatorId: string) {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const body = (await request.json()) as { follow?: boolean };
  const userId = auth.userId;
  if (userId === creatorId) {
    return json({ error: 'You cannot follow yourself.' }, { status: 400 });
  }

  const creator = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(creatorId).first();
  if (!creator) return json({ error: 'Creator not found.' }, { status: 404 });

  const shouldFollow = body.follow !== false;

  if (shouldFollow) {
    const inserted = await env.DB.prepare(
      'INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)',
    )
      .bind(userId, creatorId)
      .run();

    if (inserted.meta.changes > 0) {
      const follower = await env.DB.prepare('SELECT name FROM users WHERE id = ?')
        .bind(userId)
        .first();
      const activityId = createId('act');
      await env.DB.prepare(
        'INSERT INTO activity (id, user_id, type, title, subtitle, unread, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
      )
        .bind(
          activityId,
          creatorId,
          'follower',
          'New follower',
          `${follower?.name ?? 'Someone'} started following you`,
          1,
        )
        .run();
    }
    return json({ following: true });
  }

  await env.DB.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?')
    .bind(userId, creatorId)
    .run();

  return json({ following: false });
}

async function markActivityRead(env: Env, request: Request, userId: string) {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  if (auth.userId !== userId) return unauthorized();

  const body = (await request.json()) as { markAll?: boolean; activityId?: string };

  if (body.markAll) {
    await env.DB.prepare('UPDATE activity SET unread = 0 WHERE user_id = ?').bind(userId).run();
  } else if (body.activityId) {
    await env.DB.prepare('UPDATE activity SET unread = 0 WHERE id = ? AND user_id = ?')
      .bind(body.activityId, userId)
      .run();
  } else {
    return json({ error: 'markAll or activityId is required.' }, { status: 400 });
  }

  return json({ success: true });
}

async function updateUser(env: Env, request: Request, userId: string) {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  if (auth.userId !== userId) return unauthorized();

  const body = (await request.json()) as { name?: string; bio?: string };
  if (!body.name) {
    return json({ error: 'name is required.' }, { status: 400 });
  }

  const updated = await env.DB.prepare(
    'UPDATE users SET name = ?, bio = ? WHERE id = ?',
  )
    .bind(body.name, body.bio || '', userId)
    .run();

  if (updated.meta.changes === 0) {
    return json({ error: 'User not found.' }, { status: 404 });
  }

  return json({ success: true, name: body.name, bio: body.bio || '' });
}

async function toggleSavePoll(env: Env, request: Request, pollId: string) {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const body = (await request.json()) as { save?: boolean };
  const poll = await env.DB.prepare('SELECT id FROM polls WHERE id = ?').bind(pollId).first();
  if (!poll) return json({ error: 'Poll not found.' }, { status: 404 });

  const shouldSave = body.save !== false;

  if (shouldSave) {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO saved_polls (user_id, poll_id) VALUES (?, ?)',
    )
      .bind(auth.userId, pollId)
      .run();
    return json({ saved: true });
  }

  await env.DB.prepare('DELETE FROM saved_polls WHERE user_id = ? AND poll_id = ?')
    .bind(auth.userId, pollId)
    .run();
  return json({ saved: false });
}

async function getSavedPolls(env: Env, request: Request, userId: string) {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  if (auth.userId !== userId) return unauthorized();

  const pollRows = await env.DB.prepare(
    `SELECT p.id, p.question, p.category, sp.created_at,
            COALESCE(SUM(o.votes_count), 0) AS votes_count
     FROM saved_polls sp
     JOIN polls p ON p.id = sp.poll_id
     LEFT JOIN poll_options o ON o.poll_id = p.id
     WHERE sp.user_id = ?
     GROUP BY p.id
     ORDER BY sp.created_at DESC
     LIMIT 50`,
  )
    .bind(userId)
    .all();

  const polls = pollRows.results.map((row) => ({
    id: row.id,
    question: row.question,
    category: row.category,
    timeAgo: timeAgo(String(row.created_at)),
    votes: Number(row.votes_count),
  }));
  return json({ polls });
}

async function getComments(env: Env, pollId: string) {
  const poll = await env.DB.prepare('SELECT id FROM polls WHERE id = ?').bind(pollId).first();
  if (!poll) return json({ error: 'Poll not found.' }, { status: 404 });

  const rows = await env.DB.prepare(
    `SELECT c.id, c.body, c.created_at,
            u.id AS author_id, u.name AS author_name, u.handle AS author_handle,
            u.avatar_url AS author_avatar
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.poll_id = ?
     ORDER BY c.created_at ASC
     LIMIT 100`,
  )
    .bind(pollId)
    .all();

  const comments = rows.results.map((row) => ({
    id: row.id,
    body: row.body,
    timeAgo: timeAgo(String(row.created_at)),
    author: {
      id: row.author_id,
      name: row.author_name,
      handle: row.author_handle,
      avatar: row.author_avatar,
    },
  }));

  return json({ comments });
}

async function addComment(env: Env, request: Request, pollId: string) {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const poll = await env.DB.prepare('SELECT id, creator_id, question FROM polls WHERE id = ?')
    .bind(pollId)
    .first();
  if (!poll) return json({ error: 'Poll not found.' }, { status: 404 });

  const body = (await request.json()) as { body?: string };
  const text = body.body?.trim() ?? '';
  if (!text || text.length > 500) {
    return json({ error: 'Comment must be 1-500 characters.' }, { status: 400 });
  }

  const commentId = createId('cmt');
  const author = await env.DB.prepare(
    'SELECT id, name, handle, avatar_url AS avatar FROM users WHERE id = ?',
  )
    .bind(auth.userId)
    .first();

  if (!author) return notFound();

  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO comments (id, poll_id, user_id, body) VALUES (?, ?, ?, ?)',
    ).bind(commentId, pollId, auth.userId, text),
    env.DB.prepare('UPDATE polls SET comments_count = comments_count + 1 WHERE id = ?').bind(pollId),
  ]);

  if (String(poll.creator_id) !== auth.userId) {
    const activityId = createId('act');
    const preview = text.length > 60 ? `${text.slice(0, 60)}…` : text;
    await env.DB.prepare(
      'INSERT INTO activity (id, user_id, poll_id, type, title, subtitle, unread, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))',
    )
      .bind(
        activityId,
        poll.creator_id,
        pollId,
        'comment',
        'New comment on your poll',
        preview,
        1,
      )
      .run();
  }

  return json({
    comment: {
      id: commentId,
      body: text,
      timeAgo: 'just now',
      author: {
        id: author.id,
        name: author.name,
        handle: author.handle,
        avatar: author.avatar,
      },
    },
  });
}

export default {
  async fetch(request: Request, env: Env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const pollMatch = path.match(/^\/polls\/([^/]+)$/);
    const voteMatch = path.match(/^\/polls\/([^/]+)\/votes$/);
    const commentsMatch = path.match(/^\/polls\/([^/]+)\/comments$/);
    const saveMatch = path.match(/^\/polls\/([^/]+)\/save$/);
    const mediaMatch = path.match(/^\/media\/(.+)$/);
    const followMatch = path.match(/^\/users\/([^/]+)\/follow$/);
    const updateUserMatch = path.match(/^\/users\/([^/]+)$/);

    try {
      if (request.method === 'GET' && path === '/health') {
        const health: Record<string, unknown> = { service: 'pollpop-api', ok: false, db: 'unchecked', r2: 'unchecked' };
        // Probe D1
        try {
          await env.DB.prepare('SELECT 1').first();
          health.db = 'ok';
        } catch (e) {
          health.db = e instanceof Error ? e.message : 'error';
        }
        // Probe R2
        try {
          await env.MEDIA.head('__healthcheck__');
          health.r2 = 'ok';
        } catch (e) {
          health.r2 = e instanceof Error ? e.message : 'error';
        }
        health.ok = health.db === 'ok' && health.r2 === 'ok';
        return json(health, { status: health.ok ? 200 : 503 });
      }
      if (request.method === 'POST' && path === '/auth/register') return registerAccount(env, request);
      if (request.method === 'POST' && path === '/auth/login') return loginAccount(env, request);
      if (request.method === 'GET' && path === '/auth/me') return getAuthMe(env, request);
      if (request.method === 'POST' && path === '/auth/device') return registerDevice(env, request);
      if (request.method === 'GET' && path === '/polls') return getPolls(env, request);
      if (request.method === 'POST' && path === '/polls') return createPoll(env, request);
      if (request.method === 'GET' && pollMatch) return getPoll(env, pollMatch[1], request);
      if (request.method === 'GET' && commentsMatch) return getComments(env, commentsMatch[1]);
      if (request.method === 'POST' && commentsMatch) return addComment(env, request, commentsMatch[1]);
      if (request.method === 'POST' && voteMatch) return vote(env, request, voteMatch[1]);
      if (request.method === 'POST' && saveMatch) return toggleSavePoll(env, request, saveMatch[1]);
      if (request.method === 'POST' && path === '/uploads') return uploadMedia(env, request);
      if (request.method === 'GET' && mediaMatch) return getMedia(env, mediaMatch[1]);
      // User endpoints
      const userPollsMatch = path.match(/^\/users\/([^/]+)\/polls$/);
      const savedPollsMatch = path.match(/^\/users\/([^/]+)\/saved$/);
      const userMatch = path.match(/^\/users\/([^/]+)$/);
      const activityMatch = path.match(/^\/activity\/([^/]+)$/);
      if (request.method === 'GET' && userPollsMatch) return getUserPolls(env, userPollsMatch[1]);
      if (request.method === 'GET' && savedPollsMatch) return getSavedPolls(env, request, savedPollsMatch[1]);
      if (request.method === 'GET' && userMatch) return getUser(env, request, userMatch[1]);
      if (request.method === 'PATCH' && updateUserMatch) return updateUser(env, request, updateUserMatch[1]);
      if (request.method === 'GET' && activityMatch) return getActivity(env, request, activityMatch[1]);
      if (request.method === 'PATCH' && activityMatch) return markActivityRead(env, request, activityMatch[1]);
      if (request.method === 'POST' && followMatch) return toggleFollow(env, request, followMatch[1]);
      return notFound();
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : 'Unexpected server error' },
        { status: 500 },
      );
    }
  },
};
