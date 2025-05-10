# Deploying to Railway

## Prerequisites
1. A Railway account (sign up at https://railway.app)
2. Git installed on your computer
3. Railway CLI (optional but recommended)

## Step 1: Prepare Your Project
1. Make sure your project is in a Git repository:
```bash
git init
git add .
git commit -m "Initial commit"
```

2. Create a `.gitignore` file:
```bash
node_modules/
.env
.DS_Store
```

## Step 2: Deploy to Railway

### Option 1: Using Railway Dashboard (Recommended)
1. Go to https://railway.app/dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account if not already connected
5. Select your repository
6. Railway will automatically detect your Node.js application
7. Add the following environment variables in Railway dashboard:
   - `PORT` (Railway will set this automatically)
   - `MONGODB_URI` (Get this from Railway's MongoDB plugin)
   - `NODE_ENV=production`

### Option 2: Using Railway CLI
1. Install Railway CLI:
```bash
npm i -g @railway/cli
```

2. Login to Railway:
```bash
railway login
```

3. Initialize your project:
```bash
railway init
```

4. Link to your project:
```bash
railway link
```

5. Add environment variables:
```bash
railway variables set NODE_ENV=production
```

6. Deploy your application:
```bash
railway up
```

## Step 3: Set Up MongoDB
1. In Railway dashboard, click "New"
2. Select "Database" → "MongoDB"
3. Railway will provision a MongoDB instance
4. Copy the MongoDB connection string
5. Add it as `MONGODB_URI` in your project's environment variables

## Step 4: Configure Domain (Optional)
1. In Railway dashboard, go to your project
2. Click on "Settings"
3. Under "Domains", click "Generate Domain"
4. Railway will provide you with a domain like `your-app.railway.app`
5. You can also add a custom domain if you have one

## Monitoring and Maintenance
1. View logs in Railway dashboard
2. Monitor application health
3. View deployment status
4. Check database status

## Troubleshooting
1. Check deployment logs in Railway dashboard
2. Verify environment variables are set correctly
3. Ensure MongoDB connection string is valid
4. Check if the application is listening on the correct port

## Common Issues
1. **Application not starting**: Check if all environment variables are set
2. **Database connection issues**: Verify MongoDB connection string
3. **Build failures**: Check if all dependencies are in package.json
4. **Port issues**: Make sure your app uses `process.env.PORT`

## Updating Your Application
1. Make your changes locally
2. Commit and push to GitHub
3. Railway will automatically deploy the changes
4. Monitor the deployment in Railway dashboard 