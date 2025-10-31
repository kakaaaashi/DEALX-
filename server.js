import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Ensure uploads folder exists (for multer temp)
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

const upload = multer({ dest: UPLOADS_DIR, limits: { fileSize: 10 * 1024 * 1024 } });

// Cloudinary config using CLOUDINARY_* env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || process.env.CLOUD_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || process.env.CLOUD_API_SECRET || ''
});

// Postgres pool (DATABASE_URL)
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set');
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Ensure table exists
async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price TEXT,
        contact TEXT,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`
    );
  } finally {
    client.release();
  }
}
initDb().catch(err => console.error('DB init error', err));

app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/public', express.static(path.join(process.cwd(), 'public')));

// Home - list items
app.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products ORDER BY created_at DESC LIMIT 20');
    res.render('index', { products: rows });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/items', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    res.render('items', { products: rows });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/add', (req, res) => res.render('add'));

app.post('/add', upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, contact } = req.body;
    let imageUrl = null;

    if (req.file) {
      // upload to cloudinary if configured
      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'dealx_uploads',
          use_filename: true,
          unique_filename: false,
          resource_type: 'image'
        });
        imageUrl = result.secure_url;
      } else {
        // fallback: move to public/uploads
        const dest = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        const ext = path.extname(req.file.originalname) || '.jpg';
        const filename = Date.now() + ext;
        const destPath = path.join(dest, filename);
        fs.renameSync(req.file.path, destPath);
        imageUrl = '/public/uploads/' + filename;
      }
    }

    await pool.query(
      'INSERT INTO products (name, description, price, contact, image_url) VALUES ($1,$2,$3,$4,$5)',
      [name, description, price, contact, imageUrl]
    );

    // remove temp file if exists
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch(e){}
    }

    res.redirect('/items');
  } catch (err) {
    console.error('Upload failed', err);
    res.status(500).send('Upload failed');
  }
});

app.get('/item/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { rows } = await pool.query('SELECT * FROM products WHERE id=$1', [id]);
    if (!rows[0]) return res.redirect('/items');
    res.render('item', { item: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/about', (req, res) => res.render('about'));

// health
app.get('/healthz', (req, res) => res.send('OK'));

app.listen(PORT, () => console.log(`DealX running on port ${PORT}`));
