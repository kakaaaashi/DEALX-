DealX - The Campus Reuse Hub (Premium Ready-to-deploy)

Short deploy steps:
1. Push this folder to GitHub (root of repo).
2. On Render: New + -> Web Service -> connect repo.
   - Build: npm install
   - Start: npm start
   - Health check: /healthz
3. In Render -> Environment add these variables:
   DATABASE_URL = <your_postgres_url>
   CLOUDINARY_CLOUD_NAME = <your_cloud_name>
   CLOUDINARY_API_KEY = <your_cloud_api_key>
   CLOUDINARY_API_SECRET = <your_cloud_api_secret>
   PORT = 10000
4. Deploy and test.
