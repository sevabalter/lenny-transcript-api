# Lenny Transcript API

A simple API for extracting podcast transcripts from Lenny's Newsletter.

## Usage

Send a POST request to `/transcript` with a JSON body containing the URL:

```json
{
  "url": "https://www.lennysnewsletter.com/p/your-podcast-post"
}
```

## Environment Variables

- `PORT` - Port to run the server on (default: 3000)
- `NODE_ENV` - Environment (default: production)

## Deploying

This application can be deployed to Railway. Follow these steps:

1. Sign up for Railway at https://railway.app/
2. Create a new project
3. Connect your GitHub repository
4. Deploy the application

## Requirements

- Node.js 18+
- npm
- Puppeteer
- Express
