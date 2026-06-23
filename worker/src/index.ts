export interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  PUBLIC_MEDIA_BASE_URL?: string;
}

type JsonValue = Record<string, unknown> | unknown[];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
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

const createId = (prefix: string) =>
  `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 18)}`;

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
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 50);

  const where: string[] = [];
  const binds: unknown[] = [];
  if (category && category !== 'all') {
    where.push('p.category = ?');
    binds.push(category);
  }
  if (search) {
    where.push('(p.question LIKE ? OR u.name LIKE ? OR u.handle LIKE ?)');
    binds.push(`%${search}%`, `%${search}%`, `%${search}%`);
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

  return json({ polls, stories: stories.results, creators: creators.results });
}

async function getPoll(env: Env, id: string) {
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
  const creatorId = body.creatorId || 'u0';

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

  return getPoll(env, pollId);
}

async function vote(env: Env, request: Request, pollId: string) {
  const body = (await request.json()) as { optionId?: string; voterKey?: string };
  if (!body.optionId || !body.voterKey) {
    return json({ error: 'optionId and voterKey are required.' }, { status: 400 });
  }

  const option = await env.DB.prepare('SELECT id FROM poll_options WHERE id = ? AND poll_id = ?')
    .bind(body.optionId, pollId)
    .first();
  if (!option) return json({ error: 'Option does not belong to this poll.' }, { status: 400 });

  const voteId = createId('vote');
  const inserted = await env.DB.prepare(
    'INSERT OR IGNORE INTO votes (id, poll_id, option_id, voter_key) VALUES (?, ?, ?, ?)',
  )
    .bind(voteId, pollId, body.optionId, body.voterKey)
    .run();

  if (inserted.meta.changes > 0) {
    await env.DB.prepare('UPDATE poll_options SET votes_count = votes_count + 1 WHERE id = ?')
      .bind(body.optionId)
      .run();
  }

  const response = await getPoll(env, pollId);
  const payload = (await response.json()) as Record<string, unknown>;
  return json({ ...payload, accepted: inserted.meta.changes > 0 });
}

async function uploadMedia(env: Env, request: Request) {
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

async function getUser(env: Env, id: string) {
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
      // followers/following not yet tracked — return 0 for now
      followers: 0,
      following: 0,
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

async function getActivity(env: Env, userId: string) {
  const rows = await env.DB.prepare(
    `SELECT id, type, title, subtitle, unread, created_at
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
  }));
  return json({ activity: items });
}

export default {
  async fetch(request: Request, env: Env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const pollMatch = path.match(/^\/polls\/([^/]+)$/);
    const voteMatch = path.match(/^\/polls\/([^/]+)\/votes$/);
    const mediaMatch = path.match(/^\/media\/(.+)$/);

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
      if (request.method === 'GET' && path === '/polls') return getPolls(env, request);
      if (request.method === 'POST' && path === '/polls') return createPoll(env, request);
      if (request.method === 'GET' && pollMatch) return getPoll(env, pollMatch[1]);
      if (request.method === 'POST' && voteMatch) return vote(env, request, voteMatch[1]);
      if (request.method === 'POST' && path === '/uploads') return uploadMedia(env, request);
      if (request.method === 'GET' && mediaMatch) return getMedia(env, mediaMatch[1]);
      // User endpoints
      const userPollsMatch = path.match(/^\/users\/([^/]+)\/polls$/);
      const userMatch = path.match(/^\/users\/([^/]+)$/);
      const activityMatch = path.match(/^\/activity\/([^/]+)$/);
      if (request.method === 'GET' && userPollsMatch) return getUserPolls(env, userPollsMatch[1]);
      if (request.method === 'GET' && userMatch) return getUser(env, userMatch[1]);
      if (request.method === 'GET' && activityMatch) return getActivity(env, activityMatch[1]);
      return notFound();
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : 'Unexpected server error' },
        { status: 500 },
      );
    }
  },
};
