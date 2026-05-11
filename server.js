/**
 * 5S Action Tracker - Standalone Mock Server
 * 
 * Runs WITHOUT PostgreSQL, AWS S3, or OpenAI API.
 * All data is stored in-memory for demo/development purposes.
 * 
 * Usage: node server/mock-server.js
 */

const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const { randomUUID } = require('crypto');

// ============================================================
// Constants (replaces TypeScript enum)
// ============================================================

const Status = {
  NOT_STARTED: 'not_started',
  WIP: 'wip',
  DONE: 'done',
  COMPLETED: 'completed',
};

const ALLOWED_TRANSITIONS = {
  [Status.NOT_STARTED]: [Status.WIP],
  [Status.WIP]: [Status.NOT_STARTED, Status.DONE],
  [Status.DONE]: [Status.WIP, Status.COMPLETED],
  [Status.COMPLETED]: [],
};

// ============================================================
// In-Memory Data Store
// ============================================================

const actionItems = [];
const photos = [];
const chatMessages = [];
const links = [];
const metrics = [];
const notifications = [];
const fileStore = new Map(); // fileKey -> { buffer, mimeType }
const members = [];
const areas = [];

// ============================================================
// Fake AI Title Generator
// ============================================================

const FAKE_AI_TITLES = [
  '工具棚の整理整頓（5S活動）',
  '作業台周辺の清掃実施',
  '部品保管エリアのラベル貼り',
  '通路の安全確保と表示改善',
  '不要品の分別と廃棄処理',
  '工場入口の掲示板更新',
  '検査エリアの照明改善',
  '資材置き場の定位置管理',
  '休憩室の清潔維持活動',
  '倉庫内の在庫整理',
  '機械周辺の油漏れ対策',
  '事務所デスクの書類整理',
  '安全通路のライン引き直し',
  '工具の定位置化と見える化',
  '廃棄物分別ルールの掲示',
];

function generateFakeTitle() {
  return FAKE_AI_TITLES[Math.floor(Math.random() * FAKE_AI_TITLES.length)];
}

// ============================================================
// Seed Data - 5 sample action items
// ============================================================

function seedData() {
  const now = new Date();
  const sampleItems = [
    {
      id: randomUUID(),
      title: '工具棚の整理整頓（5S活動）',
      status: Status.WIP,
      category: '整理',
      area: '製造ライン A',
      createdBy: 'user-tanaka',
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: null,
    },
    {
      id: randomUUID(),
      title: '作業台周辺の清掃実施',
      status: Status.DONE,
      category: '清掃',
      area: '組立エリア B',
      createdBy: 'user-suzuki',
      createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: null,
    },
    {
      id: randomUUID(),
      title: '部品保管エリアのラベル貼り',
      status: Status.NOT_STARTED,
      category: '整頓',
      area: '倉庫 C',
      createdBy: 'user-yamada',
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: null,
    },
    {
      id: randomUUID(),
      title: '通路の安全確保と表示改善',
      status: Status.COMPLETED,
      category: '躾',
      area: '製造ライン A',
      createdBy: 'user-tanaka',
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: randomUUID(),
      title: '不要品の分別と廃棄処理',
      status: Status.WIP,
      category: '清潔',
      area: '検査室 D',
      createdBy: 'user-sato',
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: null,
    },
  ];

  for (const item of sampleItems) {
    actionItems.push({ ...item, photos: [], metrics: null, pocs: [], dueDate: null, reactions: {} });
  }

  // Add sample metrics to the completed item
  const completedItem = actionItems.find(i => i.status === Status.COMPLETED);
  const sampleMetrics = {
    id: randomUUID(),
    actionItemId: completedItem.id,
    timeSavedHours: 2.5,
    costSavedYen: 15000,
    safetyScoreChange: 10,
    notes: '通路幅を確保し、安全表示を追加。作業効率も向上。',
    recordedAt: completedItem.updatedAt,
  };
  metrics.push(sampleMetrics);
  completedItem.metrics = sampleMetrics;

  // Add sample notifications
  notifications.push(
    {
      id: randomUUID(),
      userId: 'user-tanaka',
      actionItemId: completedItem.id,
      type: 'status_change',
      message: '「通路の安全確保と表示改善」が完了しました。',
      isRead: false,
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: randomUUID(),
      userId: 'user-tanaka',
      actionItemId: actionItems[0].id,
      type: 'chat_message',
      message: '「工具棚の整理整頓」に新しいメッセージがあります。',
      isRead: false,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    }
  );

  // Add sample chat messages
  chatMessages.push(
    {
      id: randomUUID(),
      actionItemId: actionItems[0].id,
      senderId: 'user-suzuki',
      body: '工具棚の上段を整理しました。写真を添付します。',
      sentAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      attachments: [],
    },
    {
      id: randomUUID(),
      actionItemId: actionItems[0].id,
      senderId: 'user-tanaka',
      body: 'ありがとうございます。下段もお願いできますか？',
      sentAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      attachments: [],
    }
  );

  // Add sample links
  links.push(
    {
      id: randomUUID(),
      actionItemId: actionItems[0].id,
      url: 'https://example.com/sop/tool-organization',
      title: '工具整理手順書',
      type: 'sop',
      relevanceScore: 0.95,
      addedBy: null,
      addedAt: actionItems[0].createdAt,
    },
    {
      id: randomUUID(),
      actionItemId: actionItems[0].id,
      url: 'https://example.com/manual/5s-guide',
      title: '5S活動ガイドライン',
      type: 'manual',
      relevanceScore: null,
      addedBy: 'user-tanaka',
      addedAt: actionItems[0].createdAt,
    }
  );

  console.log(`✅ Seeded ${actionItems.length} action items`);
}

// ============================================================
// Express + Socket.io Setup
// ============================================================

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  if (req.method !== 'GET') {
    console.log(`📨 ${req.method} ${req.url} [${new Date().toISOString()}]`);
  }
  next();
});

// Multer for in-memory file uploads (limit to 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ============================================================
// Socket.io - Real-time chat
// ============================================================

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('join-action-item', (actionItemId) => {
    socket.join(`action-item:${actionItemId}`);
    console.log(`  → Joined room: action-item:${actionItemId}`);
  });

  socket.on('leave-action-item', (actionItemId) => {
    socket.leave(`action-item:${actionItemId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// ============================================================
// Serve Static Frontend Files
// ============================================================

const path = require('path');
const publicDir = __dirname;
app.use(express.static(publicDir));

// ============================================================
// Health Check
// ============================================================

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', mode: 'mock', timestamp: new Date().toISOString() });
});

// ============================================================
// Action Items Routes
// ============================================================

/**
 * GET /api/action-items - List with optional filters
 */
app.get('/api/action-items', (req, res) => {
  let items = [...actionItems];

  const { status, category, area, page, pageSize } = req.query;

  if (status) items = items.filter(i => i.status === status);
  if (category) items = items.filter(i => i.category === category);
  if (area) items = items.filter(i => i.area === area);

  // Sort by createdAt descending
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const p = Math.max(1, parseInt(page, 10) || 1);
  const ps = Math.min(200, Math.max(1, parseInt(pageSize, 10) || 20));
  const total = items.length;
  const paginatedItems = items.slice((p - 1) * ps, p * ps);

  res.json({
    items: paginatedItems,
    total,
    page: p,
    pageSize: ps,
    totalPages: Math.ceil(total / ps),
  });
});

/**
 * POST /api/action-items - Create new action item
 */
app.post('/api/action-items', (req, res) => {
  const contentType = req.headers['content-type'] || '';

  // Handle multipart form data manually for Bun compatibility
  if (contentType.includes('multipart/form-data')) {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const boundary = contentType.split('boundary=')[1];
      const boundaryBuffer = Buffer.from('--' + boundary);

      // Simple multipart parser
      const bodyStr = buffer.toString('latin1');
      const parts = bodyStr.split('--' + boundary);

      let createdBy = '';
      let category = '';
      let area = '';
      let title = '';
      let hasPhoto = false;
      let photoFilename = 'photo.jpg';
      let photoMimeType = 'image/jpeg';
      let photoSize = 0;
      let photoBuffer = null;

      for (const part of parts) {
        if (part.includes('name="createdBy"')) {
          createdBy = part.split('\r\n\r\n')[1]?.trim().replace(/\r\n--$/, '').replace(/\r\n$/, '') || '';
        }
        if (part.includes('name="category"')) {
          category = part.split('\r\n\r\n')[1]?.trim().replace(/\r\n--$/, '').replace(/\r\n$/, '') || '';
        }
        if (part.includes('name="area"')) {
          area = part.split('\r\n\r\n')[1]?.trim().replace(/\r\n--$/, '').replace(/\r\n$/, '') || '';
        }
        if (part.includes('name="title"')) {
          title = part.split('\r\n\r\n')[1]?.trim().replace(/\r\n--$/, '').replace(/\r\n$/, '') || '';
        }
        if (part.includes('name="photo"') && part.includes('filename=')) {
          hasPhoto = true;
          const filenameMatch = part.match(/filename="([^"]+)"/);
          if (filenameMatch) photoFilename = filenameMatch[1];
          const mimeMatch = part.match(/Content-Type:\s*(\S+)/);
          if (mimeMatch) photoMimeType = mimeMatch[1].trim();
          // Extract binary data from the original buffer
          const partStartStr = '--' + boundary + '\r\n';
          const headerEnd = part.indexOf('\r\n\r\n') + 4;
          photoSize = part.length - headerEnd - 2;
        }
      }

      // Extract actual photo binary from the raw buffer
      if (hasPhoto) {
        const boundaryStr = '--' + boundary;
        let searchFrom = 0;
        for (const part of bodyStr.split(boundaryStr)) {
          if (part.includes('name="photo"') && part.includes('filename=')) {
            const headerEnd = part.indexOf('\r\n\r\n') + 4;
            const dataStr = part.substring(headerEnd);
            // Remove trailing \r\n
            const cleanData = dataStr.replace(/\r\n$/, '');
            photoBuffer = Buffer.from(cleanData, 'latin1');
            photoSize = photoBuffer.length;
            break;
          }
        }
      }

      if (!createdBy) {
        res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'createdBy は必須です。',
          retryable: false,
        });
        return;
      }

      const now = new Date().toISOString();
      let photoData;
      let generatedTitle = title || generateFakeTitle();

      if (hasPhoto) {
        const fakeKey = `photos/initial/${randomUUID()}-${photoFilename}`;
        photoData = {
          id: randomUUID(),
          actionItemId: '',
          type: 'initial',
          fileKey: fakeKey,
          originalFilename: photoFilename,
          mimeType: photoMimeType,
          fileSizeBytes: photoSize,
          uploadedBy: createdBy,
          uploadedAt: now,
        };
        // Store actual file data
        if (photoBuffer) {
          fileStore.set(fakeKey, { buffer: photoBuffer, mimeType: photoMimeType });
        }
        generatedTitle = generateFakeTitle();
      }

      const newItem = {
        id: randomUUID(),
        title: generatedTitle,
        status: Status.NOT_STARTED,
        category: category || '',
        area: area || '未指定',
        createdBy,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        photos: [],
        metrics: null,
        pocs: [],
        dueDate: null,
        reactions: {},
      };

      if (photoData) {
        photoData.actionItemId = newItem.id;
        newItem.photos.push(photoData);
        photos.push(photoData);
      }

      actionItems.push(newItem);
      console.log(`✅ Created action item: ${newItem.title}`);
      res.status(201).json(newItem);
    });
    return;
  }

  // JSON body fallback
  const { category, area, createdBy, title } = req.body;

  if (!createdBy) {
    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'createdBy は必須です。',
      retryable: false,
    });
    return;
  }

  const now = new Date().toISOString();
  const generatedTitle = title || generateFakeTitle();

  const newItem = {
    id: randomUUID(),
    title: generatedTitle,
    status: Status.NOT_STARTED,
    category: category || '',
    area: area || '未指定',
    createdBy,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    photos: [],
    metrics: null,
    pocs: [],
    dueDate: null,
    reactions: {},
  };

  actionItems.push(newItem);
  console.log(`✅ Created action item: ${newItem.title}`);
  res.status(201).json(newItem);
});

/**
 * GET /api/action-items/:id - Get single item
 */
app.get('/api/action-items/:id', (req, res) => {
  const item = actionItems.find(i => i.id === req.params.id);
  if (!item) {
    res.status(404).json({
      code: 'NOT_FOUND',
      message: 'アクションアイテムが見つかりません。',
      retryable: false,
    });
    return;
  }
  res.json(item);
});

/**
 * DELETE /api/action-items/:id - Delete an action item
 */
app.delete('/api/action-items/:id', (req, res) => {
  const idx = actionItems.findIndex(i => i.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({
      code: 'NOT_FOUND',
      message: 'アクションアイテムが見つかりません。',
      retryable: false,
    });
    return;
  }
  actionItems.splice(idx, 1);
  res.status(204).send();
});

/**
 * GET /api/files/* - Serve uploaded photos from memory store
 */
app.get('/api/files/*', (req, res) => {
  const fileKey = req.params[0];
  const stored = fileStore.get(fileKey);

  if (stored) {
    res.set('Content-Type', stored.mimeType);
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(stored.buffer);
  } else {
    // Return a placeholder gray image for seed data photos
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAARklEQVR42u3PMQEAAAgDoC251d7eAQQ3AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgbQMNJAABVJnLIgAAAABJRU5ErkJggg==',
      'base64'
    );
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(pixel);
  }
});

/**
 * PATCH /api/action-items/:id/poc - Assign POCs by login IDs
 */
app.patch('/api/action-items/:id/poc', (req, res) => {
  const item = actionItems.find(i => i.id === req.params.id);
  if (!item) {
    res.status(404).json({
      code: 'NOT_FOUND',
      message: 'アクションアイテムが見つかりません。',
      retryable: false,
    });
    return;
  }

  const { pocs } = req.body;
  item.pocs = Array.isArray(pocs) ? pocs : [];
  item.updatedAt = new Date().toISOString();
  res.json(item);
});

/**
 * PATCH /api/action-items/:id/title - Update title
 */
app.patch('/api/action-items/:id/title', (req, res) => {
  const item = actionItems.find(i => i.id === req.params.id);
  if (!item) {
    res.status(404).json({
      code: 'NOT_FOUND',
      message: 'アクションアイテムが見つかりません。',
      retryable: false,
    });
    return;
  }

  const { title } = req.body;
  if (title === undefined || title === null) {
    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'title は必須です。',
      retryable: false,
    });
    return;
  }

  if (typeof title !== 'string' || title.length < 1 || title.length > 50) {
    res.status(400).json({
      code: 'TITLE_VALIDATION_FAILED',
      message: 'タイトルは1〜50文字で入力してください。',
      retryable: false,
    });
    return;
  }

  item.title = title;
  item.updatedAt = new Date().toISOString();
  res.json(item);
});

/**
 * PATCH /api/action-items/:id/status - Update status with transition validation
 */
app.patch('/api/action-items/:id/status', (req, res) => {
  const item = actionItems.find(i => i.id === req.params.id);
  if (!item) {
    res.status(404).json({
      code: 'NOT_FOUND',
      message: 'アクションアイテムが見つかりません。',
      retryable: false,
    });
    return;
  }

  const { status: newStatus, userId } = req.body;

  if (!newStatus) {
    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'status は必須です。',
      retryable: false,
    });
    return;
  }

  if (!userId) {
    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'userId は必須です。',
      retryable: false,
    });
    return;
  }

  // Validate transition - REMOVED: allow all transitions
  // const allowed = ALLOWED_TRANSITIONS[item.status];
  // if (!allowed || !allowed.includes(newStatus)) { ... }

  item.status = newStatus;
  item.updatedAt = new Date().toISOString();

  if (newStatus === Status.COMPLETED) {
    item.completedAt = item.updatedAt;
  }

  // Create notification for status change
  notifications.push({
    id: randomUUID(),
    userId,
    actionItemId: item.id,
    type: 'status_change',
    message: `「${item.title}」のステータスが「${newStatus}」に変更されました。`,
    isRead: false,
    createdAt: item.updatedAt,
  });

  res.json(item);
});

// ============================================================
// Photo Upload Routes
// ============================================================

/**
 * POST /api/action-items/:id/photos/before
 */
app.post('/api/action-items/:id/photos/before', upload.array('photos', 3), (req, res) => {
  const item = actionItems.find(i => i.id === req.params.id);
  if (!item) {
    res.status(404).json({
      code: 'NOT_FOUND',
      message: 'アクションアイテムが見つかりません。',
      retryable: false,
    });
    return;
  }

  const { uploadedBy } = req.body;
  if (!uploadedBy) {
    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'uploadedBy は必須です。',
      retryable: false,
    });
    return;
  }

  const files = req.files;
  if (!files || files.length === 0) {
    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: '写真ファイルが必要です。',
      retryable: false,
    });
    return;
  }

  const existingBefore = item.photos.filter(p => p.type === 'before').length;
  if (existingBefore + files.length > 3) {
    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Before写真の上限（3枚）に達しています。',
      retryable: false,
    });
    return;
  }

  const now = new Date().toISOString();
  for (const file of files) {
    const photo = {
      id: randomUUID(),
      actionItemId: item.id,
      type: 'before',
      fileKey: `photos/before/${randomUUID()}-${file.originalname}`,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      uploadedBy,
      uploadedAt: now,
    };
    item.photos.push(photo);
    photos.push(photo);
    fileStore.set(photo.fileKey, { buffer: file.buffer, mimeType: file.mimetype });
  }

  item.updatedAt = now;
  res.json(item);
});

/**
 * POST /api/action-items/:id/photos/after
 */
app.post('/api/action-items/:id/photos/after', upload.array('photos', 3), (req, res) => {
  const item = actionItems.find(i => i.id === req.params.id);
  if (!item) {
    res.status(404).json({
      code: 'NOT_FOUND',
      message: 'アクションアイテムが見つかりません。',
      retryable: false,
    });
    return;
  }

  const { uploadedBy } = req.body;
  if (!uploadedBy) {
    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'uploadedBy は必須です。',
      retryable: false,
    });
    return;
  }

  const files = req.files;
  if (!files || files.length === 0) {
    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: '写真ファイルが必要です。',
      retryable: false,
    });
    return;
  }

  const existingAfter = item.photos.filter(p => p.type === 'after').length;
  if (existingAfter + files.length > 3) {
    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'After写真の上限（3枚）に達しています。',
      retryable: false,
    });
    return;
  }

  const now = new Date().toISOString();
  for (const file of files) {
    const photo = {
      id: randomUUID(),
      actionItemId: item.id,
      type: 'after',
      fileKey: `photos/after/${randomUUID()}-${file.originalname}`,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      uploadedBy,
      uploadedAt: now,
    };
    item.photos.push(photo);
    photos.push(photo);
    fileStore.set(photo.fileKey, { buffer: file.buffer, mimeType: file.mimetype });
  }

  item.updatedAt = now;
  res.json(item);
});

// ============================================================
// Metrics Routes
// ============================================================

/**
 * POST /api/action-items/:id/metrics
 */
app.post('/api/action-items/:id/metrics', (req, res) => {
  const item = actionItems.find(i => i.id === req.params.id);
  if (!item) {
    res.status(404).json({
      code: 'NOT_FOUND',
      message: 'アクションアイテムが見つかりません。',
      retryable: false,
    });
    return;
  }

  const { timeSavedHours, costSavedYen, safetyScoreChange, notes } = req.body;

  // Basic validation
  if (timeSavedHours !== undefined && timeSavedHours !== null) {
    if (timeSavedHours < 0.1 || timeSavedHours > 9999.9) {
      res.status(400).json({
        code: 'METRICS_VALIDATION_FAILED',
        message: '時間削減は0.1〜9999.9の範囲で入力してください。',
        retryable: false,
      });
      return;
    }
  }

  if (costSavedYen !== undefined && costSavedYen !== null) {
    if (costSavedYen < 1 || costSavedYen > 999999999) {
      res.status(400).json({
        code: 'METRICS_VALIDATION_FAILED',
        message: 'コスト削減は1〜999999999の範囲で入力してください。',
        retryable: false,
      });
      return;
    }
  }

  if (safetyScoreChange !== undefined && safetyScoreChange !== null) {
    if (safetyScoreChange < -100 || safetyScoreChange > 100) {
      res.status(400).json({
        code: 'METRICS_VALIDATION_FAILED',
        message: '安全スコア変化は-100〜100の範囲で入力してください。',
        retryable: false,
      });
      return;
    }
  }

  const newMetrics = {
    id: randomUUID(),
    actionItemId: item.id,
    timeSavedHours: timeSavedHours ?? null,
    costSavedYen: costSavedYen ?? null,
    safetyScoreChange: safetyScoreChange ?? null,
    notes: notes ?? null,
    recordedAt: new Date().toISOString(),
  };

  metrics.push(newMetrics);
  item.metrics = newMetrics;
  item.updatedAt = new Date().toISOString();

  res.json(item);
});

// ============================================================
// Chat / Messages Routes
// ============================================================

/**
 * GET /api/action-items/:id/messages
 */
app.get('/api/action-items/:id/messages', (req, res) => {
  const actionItemId = req.params.id;
  const { page, pageSize } = req.query;

  let messages = chatMessages
    .filter(m => m.actionItemId === actionItemId)
    .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

  const p = Math.max(1, parseInt(page, 10) || 1);
  const ps = Math.min(200, Math.max(1, parseInt(pageSize, 10) || 50));
  const total = messages.length;
  const paginatedMessages = messages.slice((p - 1) * ps, p * ps);

  res.json({
    messages: paginatedMessages,
    total,
    page: p,
    pageSize: ps,
    totalPages: Math.ceil(total / ps),
  });
});

/**
 * POST /api/action-items/:id/messages
 */
app.post('/api/action-items/:id/messages', upload.array('attachments', 3), (req, res) => {
  const actionItemId = req.params.id;
  const { senderId, body } = req.body;

  if (!senderId) {
    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'senderId は必須です。',
      retryable: false,
    });
    return;
  }

  const files = req.files;

  // Validate: must have body or attachments
  if ((!body || body.trim() === '') && (!files || files.length === 0)) {
    res.status(400).json({
      code: 'EMPTY_MESSAGE',
      message: 'メッセージ本文または添付ファイルが必要です。',
      retryable: false,
    });
    return;
  }

  if (body && body.length > 1000) {
    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'メッセージは1000文字以内で入力してください。',
      retryable: false,
    });
    return;
  }

  const messageId = randomUUID();
  const attachments = [];

  if (files && files.length > 0) {
    for (const file of files) {
      attachments.push({
        id: randomUUID(),
        messageId,
        fileKey: `chat/attachments/${randomUUID()}-${file.originalname}`,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
      });
    }
  }

  const message = {
    id: messageId,
    actionItemId,
    senderId,
    body: body || '',
    sentAt: new Date().toISOString(),
    attachments,
  };

  chatMessages.push(message);

  // Emit via Socket.io for real-time updates
  io.to(`action-item:${actionItemId}`).emit('new-message', message);

  res.status(201).json(message);
});

/**
 * POST /api/messages/:messageId/reactions - Toggle a reaction on a message
 */
app.post('/api/messages/:messageId/reactions', (req, res) => {
  const msg = chatMessages.find(m => m.id === req.params.messageId);
  if (!msg) {
    res.status(404).json({ code: 'NOT_FOUND', message: 'メッセージが見つかりません。', retryable: false });
    return;
  }

  const { emoji, userId } = req.body;
  if (!emoji || !userId) {
    res.status(400).json({ code: 'VALIDATION_ERROR', message: 'emoji と userId は必須です。', retryable: false });
    return;
  }

  if (!msg.reactions) msg.reactions = {};
  if (!msg.reactions[emoji]) msg.reactions[emoji] = [];

  const idx = msg.reactions[emoji].indexOf(userId);
  if (idx === -1) {
    msg.reactions[emoji].push(userId);
  } else {
    msg.reactions[emoji].splice(idx, 1);
    if (msg.reactions[emoji].length === 0) {
      delete msg.reactions[emoji];
    }
  }

  res.json(msg);
});

// ============================================================
// Links Routes
// ============================================================

/**
 * GET /api/action-items/:id/links
 */
app.get('/api/action-items/:id/links', (req, res) => {
  const actionItemId = req.params.id;
  const itemLinks = links.filter(l => l.actionItemId === actionItemId);

  // Organize by type
  const organized = {
    sop: itemLinks.filter(l => l.type === 'sop'),
    coupa: itemLinks.filter(l => l.type === 'coupa'),
    manual: itemLinks.filter(l => l.type === 'manual'),
  };

  res.json(organized);
});

/**
 * POST /api/action-items/:id/links
 */
app.post('/api/action-items/:id/links', (req, res) => {
  const actionItemId = req.params.id;
  const { url, title, addedBy } = req.body;

  if (!url) {
    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'url は必須です。',
      retryable: false,
    });
    return;
  }

  if (!title) {
    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'title は必須です。',
      retryable: false,
    });
    return;
  }

  if (!addedBy) {
    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'addedBy は必須です。',
      retryable: false,
    });
    return;
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    res.status(400).json({
      code: 'INVALID_URL',
      message: '有効なURLを入力してください。',
      retryable: false,
    });
    return;
  }

  // Check manual link limit (max 10)
  const manualLinks = links.filter(l => l.actionItemId === actionItemId && l.type === 'manual');
  if (manualLinks.length >= 10) {
    res.status(400).json({
      code: 'MANUAL_LINK_LIMIT_REACHED',
      message: '手動リンクの上限（10件）に達しています。',
      retryable: false,
    });
    return;
  }

  const newLink = {
    id: randomUUID(),
    actionItemId,
    url,
    title,
    type: 'manual',
    relevanceScore: null,
    addedBy,
    addedAt: new Date().toISOString(),
  };

  links.push(newLink);
  res.status(201).json(newLink);
});

/**
 * DELETE /api/action-items/:id/links/:linkId
 */
app.delete('/api/action-items/:id/links/:linkId', (req, res) => {
  const { id: actionItemId, linkId } = req.params;
  const idx = links.findIndex(l => l.id === linkId && l.actionItemId === actionItemId);

  if (idx === -1) {
    res.status(404).json({
      code: 'NOT_FOUND',
      message: 'リンクが見つかりません。',
      retryable: false,
    });
    return;
  }

  links.splice(idx, 1);
  res.status(204).send();
});

// ============================================================
// Metrics Dashboard Routes
// ============================================================

/**
 * GET /api/metrics/timeseries
 */
app.get('/api/metrics/timeseries', (req, res) => {
  // Generate fake time series data
  const now = new Date();
  const period = req.query.period || 'monthly';
  const dataPoints = [];

  const numPoints = period === 'daily' ? 30 : period === 'weekly' ? 12 : 6;

  for (let i = numPoints - 1; i >= 0; i--) {
    const date = new Date(now);
    if (period === 'daily') date.setDate(date.getDate() - i);
    else if (period === 'weekly') date.setDate(date.getDate() - i * 7);
    else date.setMonth(date.getMonth() - i);

    dataPoints.push({
      periodStart: date.toISOString(),
      timeSavedHours: Math.round((Math.random() * 10 + 1) * 10) / 10,
      costSavedYen: Math.floor(Math.random() * 50000) + 5000,
      safetyScoreChange: Math.floor(Math.random() * 20) - 5,
      count: Math.floor(Math.random() * 5) + 1,
    });
  }

  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() - 1);

  res.json({
    period,
    startDate: startDate.toISOString(),
    endDate: now.toISOString(),
    dataPoints,
  });
});

/**
 * GET /api/metrics/aggregates
 */
app.get('/api/metrics/aggregates', (_req, res) => {
  const totalTimeSaved = metrics.reduce((sum, m) => sum + (m.timeSavedHours || 0), 0);
  const totalCostSaved = metrics.reduce((sum, m) => sum + (m.costSavedYen || 0), 0);
  const totalSafetyScore = metrics.reduce((sum, m) => sum + (m.safetyScoreChange || 0), 0);
  const count = metrics.length;

  res.json({
    totalTimeSavedHours: Math.round(totalTimeSaved * 10) / 10,
    totalCostSavedYen: totalCostSaved,
    totalSafetyScoreChange: totalSafetyScore,
    averageTimeSavedHours: count > 0 ? Math.round((totalTimeSaved / count) * 10) / 10 : 0,
    averageCostSavedYen: count > 0 ? Math.round(totalCostSaved / count) : 0,
    averageSafetyScoreChange: count > 0 ? Math.round((totalSafetyScore / count) * 10) / 10 : 0,
    count,
  });
});

/**
 * GET /api/metrics/categories
 */
app.get('/api/metrics/categories', (_req, res) => {
  const categories = ['整理', '整頓', '清掃', '清潔', '躾'];
  const breakdown = categories.map(cat => {
    const items = actionItems.filter(i => i.category === cat);
    const catMetrics = metrics.filter(m => items.some(i => i.id === m.actionItemId));
    const totalTimeSaved = catMetrics.reduce((sum, m) => sum + (m.timeSavedHours || 0), 0);
    const totalCostSaved = catMetrics.reduce((sum, m) => sum + (m.costSavedYen || 0), 0);
    const totalSafety = catMetrics.reduce((sum, m) => sum + (m.safetyScoreChange || 0), 0);
    return {
      category: cat,
      totalTimeSavedHours: Math.round(totalTimeSaved * 10) / 10,
      totalCostSavedYen: totalCostSaved,
      totalSafetyScoreChange: totalSafety,
      count: catMetrics.length,
    };
  });

  res.json(breakdown);
});

// ============================================================
// POC Breakdown Route
// ============================================================

/**
 * GET /api/metrics/poc-breakdown - POC-based stats
 */
app.get('/api/metrics/poc-breakdown', (_req, res) => {
  // Group action items by POC
  const pocMap = {};
  for (const item of actionItems) {
    if (!item.pocs || item.pocs.length === 0) {
      if (!pocMap['未アサイン']) pocMap['未アサイン'] = { total: 0, completed: 0 };
      pocMap['未アサイン'].total++;
      if (item.status === Status.COMPLETED) pocMap['未アサイン'].completed++;
    } else {
      for (const poc of item.pocs) {
        if (!pocMap[poc]) pocMap[poc] = { total: 0, completed: 0 };
        pocMap[poc].total++;
        if (item.status === Status.COMPLETED) pocMap[poc].completed++;
      }
    }
  }
  const breakdown = Object.entries(pocMap).map(([poc, data]) => ({
    poc,
    total: data.total,
    completed: data.completed,
    completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
  }));
  res.json(breakdown);
});

// ============================================================
// Members Routes
// ============================================================

/**
 * GET /api/members - List all members
 */
app.get('/api/members', (_req, res) => {
  res.json(members);
});

/**
 * POST /api/members - Add a new member
 */
app.post('/api/members', (req, res) => {
  const { loginId, name } = req.body;

  if (!loginId || !name) {
    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'loginId と name は必須です。',
      retryable: false,
    });
    return;
  }

  const existing = members.find(m => m.loginId === loginId);
  if (existing) {
    res.status(400).json({
      code: 'DUPLICATE_MEMBER',
      message: 'この loginId は既に登録されています。',
      retryable: false,
    });
    return;
  }

  const newMember = { id: loginId, name, loginId };
  members.push(newMember);
  res.status(201).json(newMember);
});

// ============================================================
// Areas Routes
// ============================================================

/**
 * GET /api/areas - List all areas
 */
app.get('/api/areas', (_req, res) => {
  res.json(areas);
});

/**
 * POST /api/areas - Add a new area
 */
app.post('/api/areas', (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'エリア名は必須です。',
      retryable: false,
    });
    return;
  }

  const trimmed = name.trim();
  if (areas.includes(trimmed)) {
    res.status(400).json({
      code: 'DUPLICATE_AREA',
      message: 'このエリアは既に登録されています。',
      retryable: false,
    });
    return;
  }

  areas.push(trimmed);
  res.status(201).json({ name: trimmed });
});

// ============================================================
// Due Date Route
// ============================================================

/**
 * PATCH /api/action-items/:id/due - Update due date
 */
app.patch('/api/action-items/:id/due', (req, res) => {
  const item = actionItems.find(i => i.id === req.params.id);
  if (!item) {
    res.status(404).json({
      code: 'NOT_FOUND',
      message: 'アクションアイテムが見つかりません。',
      retryable: false,
    });
    return;
  }

  const { dueDate } = req.body;
  item.dueDate = dueDate || null;
  item.updatedAt = new Date().toISOString();
  res.json(item);
});

/**
 * PATCH /api/action-items/:id/category - Update category
 */
app.patch('/api/action-items/:id/category', (req, res) => {
  const item = actionItems.find(i => i.id === req.params.id);
  if (!item) { res.status(404).json({ code: 'NOT_FOUND', message: 'アクションアイテムが見つかりません。', retryable: false }); return; }
  item.category = req.body.category || '';
  item.updatedAt = new Date().toISOString();
  res.json(item);
});

/**
 * PATCH /api/action-items/:id/area - Update area
 */
app.patch('/api/action-items/:id/area', (req, res) => {
  const item = actionItems.find(i => i.id === req.params.id);
  if (!item) { res.status(404).json({ code: 'NOT_FOUND', message: 'アクションアイテムが見つかりません。', retryable: false }); return; }
  item.area = req.body.area || '';
  item.updatedAt = new Date().toISOString();
  res.json(item);
});

// ============================================================
// Reactions Route
// ============================================================

/**
 * POST /api/action-items/:id/reactions - Toggle a reaction
 */
app.post('/api/action-items/:id/reactions', (req, res) => {
  const item = actionItems.find(i => i.id === req.params.id);
  if (!item) {
    res.status(404).json({
      code: 'NOT_FOUND',
      message: 'アクションアイテムが見つかりません。',
      retryable: false,
    });
    return;
  }

  const { emoji, userId } = req.body;
  if (!emoji || !userId) {
    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'emoji と userId は必須です。',
      retryable: false,
    });
    return;
  }

  if (!item.reactions) item.reactions = {};
  if (!item.reactions[emoji]) item.reactions[emoji] = [];

  const idx = item.reactions[emoji].indexOf(userId);
  if (idx === -1) {
    item.reactions[emoji].push(userId);
  } else {
    item.reactions[emoji].splice(idx, 1);
    if (item.reactions[emoji].length === 0) {
      delete item.reactions[emoji];
    }
  }

  res.json(item);
});

// ============================================================
// Notification Routes
// ============================================================

/**
 * GET /api/notifications
 */
app.get('/api/notifications', (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    res.status(400).json({
      code: 'MISSING_USER_ID',
      message: 'ユーザーIDが必要です',
      retryable: false,
    });
    return;
  }

  const userNotifications = notifications
    .filter(n => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);

  res.json(userNotifications);
});

/**
 * GET /api/notifications/unread-count
 */
app.get('/api/notifications/unread-count', (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    res.status(400).json({
      code: 'MISSING_USER_ID',
      message: 'ユーザーIDが必要です',
      retryable: false,
    });
    return;
  }

  const count = notifications.filter(n => n.userId === userId && !n.isRead).length;
  res.json({ count });
});

/**
 * PATCH /api/notifications/:id/read
 */
app.patch('/api/notifications/:id/read', (req, res) => {
  const notification = notifications.find(n => n.id === req.params.id);
  if (!notification) {
    res.status(404).json({
      code: 'NOT_FOUND',
      message: '通知が見つかりません',
      retryable: false,
    });
    return;
  }

  notification.isRead = true;
  res.json(notification);
});

/**
 * PATCH /api/notifications/read-all
 */
app.patch('/api/notifications/read-all', (req, res) => {
  const userId = req.body.userId;
  if (!userId) {
    res.status(400).json({
      code: 'MISSING_USER_ID',
      message: 'ユーザーIDが必要です',
      retryable: false,
    });
    return;
  }

  notifications
    .filter(n => n.userId === userId && !n.isRead)
    .forEach(n => { n.isRead = true; });

  res.json({ success: true });
});

// ============================================================
// Start Server
// ============================================================

seedData();

// SPA fallback - serve index.html for all non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   5S Action Tracker - Mock Server               ║');
  console.log('║   Mode: In-Memory (no DB/S3/OpenAI required)    ║');
  console.log(`║   Port: ${PORT}                                    ║`);
  console.log('║   CORS: http://localhost:5173                    ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log('📋 Endpoints:');
  console.log('   GET    /api/health');
  console.log('   GET    /api/action-items');
  console.log('   POST   /api/action-items');
  console.log('   GET    /api/action-items/:id');
  console.log('   PATCH  /api/action-items/:id/title');
  console.log('   PATCH  /api/action-items/:id/status');
  console.log('   POST   /api/action-items/:id/photos/before');
  console.log('   POST   /api/action-items/:id/photos/after');
  console.log('   POST   /api/action-items/:id/metrics');
  console.log('   GET    /api/action-items/:id/messages');
  console.log('   POST   /api/action-items/:id/messages');
  console.log('   GET    /api/action-items/:id/links');
  console.log('   POST   /api/action-items/:id/links');
  console.log('   DELETE  /api/action-items/:id/links/:linkId');
  console.log('   GET    /api/metrics/timeseries');
  console.log('   GET    /api/metrics/aggregates');
  console.log('   GET    /api/metrics/categories');
  console.log('   GET    /api/notifications');
  console.log('   GET    /api/notifications/unread-count');
  console.log('   PATCH  /api/notifications/:id/read');
  console.log('   PATCH  /api/notifications/read-all');
  console.log('');
});
