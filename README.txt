DealX - Ready to deploy (Node + Express + EJS + Cloudinary + Postgres)

Steps to deploy on Render:
1. Create a new GitHub repo and push this project folder to it (or upload files via GitHub web).
2. On Render create a new Web Service -> connect the repo.
   - Build command: npm install
   - Start command: npm start
3. In Render -> Environment, add these variables:
   DATABASE_URL = postgresql://dealx_db_user:.../dealx_db
   CLOUDINARY_CLOUD_NAME = dj1ldcjda
   CLOUDINARY_API_KEY = 768128458791586
   CLOUDINARY_API_SECRET = c9Y3Hj0uhzAv6gjygiPCMBKWD-k
   PORT = 10000
4. Deploy (Manual Deploy -> Deploy latest commit).

Local run:
1. npm install
2. Create a .env file with the same variables as above (only for local testing)
3. npm start
