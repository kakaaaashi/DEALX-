import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

// temp upload dir for multer
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({ dest: UPLOADS_DIR, limits: { fileSize: 12 * 1024 * 1024 } });

// Cloudinary config (reads from env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || ''
});

// Postgres pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
});

// Initialize DB
async function initDb(){
  const client = await pool.connect();
  try{
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price TEXT,
        contact TEXT,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } finally {
    client.release();
  }
}
initDb().catch(e=>console.error('DB init failed', e));

// Routes
app.get('/healthz', (req,res)=> res.send('OK'));

app.get('/', async (req,res)=>{
  try{
    const { rows } = await pool.query('SELECT * FROM products ORDER BY created_at DESC LIMIT 8');
    res.render('home', { products: rows });
  }catch(e){
    console.error(e);
    res.render('home', { products: [] });
  }
});

app.get('/items', async (req,res)=>{
  try{
    const { rows } = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    res.render('items', { products: rows });
  }catch(e){
    console.error(e);
    res.render('items', { products: [] });
  }
});

app.get('/about', (req,res)=> res.render('about'));

app.get('/add', (req,res)=> res.render('add'));

app.post('/add', upload.single('image'), async (req,res)=>{
  try{
    const { name, description, price, contact } = req.body;
    let imageUrl = null;

    if (req.file){
      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET){
        const result = await cloudinary.uploader.upload(req.file.path, { folder: 'dealx_uploads', use_filename:true, unique_filename:false, resource_type:'image' });
        imageUrl = result.secure_url;
      } else {
        // fallback to public/uploads
        const dest = path.join(__dirname, 'public', 'uploads');
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        const ext = path.extname(req.file.originalname) || '.jpg';
        const filename = Date.now() + ext;
        const destPath = path.join(dest, filename);
        fs.renameSync(req.file.path, destPath);
        imageUrl = '/public/uploads/' + filename;
      }
    }

    await pool.query('INSERT INTO products (name, description, price, contact, image_url) VALUES ($1,$2,$3,$4,$5)', [name, description, price, contact, imageUrl]);

    if (req.file && fs.existsSync(req.file.path)) {
      try{ fs.unlinkSync(req.file.path); } catch(e){}
    }

    res.redirect('/items');
  }catch(e){
    console.error('Add error', e);
    res.status(500).send('Upload failed');
  }
});

app.get('/item/:id', async (req,res)=>{
  try{
    const { rows } = await pool.query('SELECT * FROM products WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.redirect('/items');
    res.render('item', { item: rows[0] });
  }catch(e){
    console.error(e);
    res.redirect('/items');
  }
});

// serve static index for routes (if any)
app.use(express.static(path.join(__dirname, 'public')));

// start server
app.listen(PORT, ()=> console.log(`DealX running on port ${PORT}`));
