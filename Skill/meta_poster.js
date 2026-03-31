require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const TOKEN    = process.env.META_PAGE_ACCESS_TOKEN;
const PAGE_ID  = process.env.META_PAGE_ID;
const IG_ID    = process.env.META_IG_USER_ID;
const GRAPH    = 'https://graph.facebook.com/v19.0';

// Post to Facebook Page
async function postToFacebook(message) {
  const resp = await fetch(`${GRAPH}/${PAGE_ID}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, access_token: TOKEN })
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error.message);
  console.log('Posted to Facebook:', data.id);
  return data.id;
}

// Post to Instagram (text via caption on image, or Reels)
async function postToInstagram(caption, imageUrl) {
  // Step 1: Create media container
  const create = await fetch(`${GRAPH}/${IG_ID}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: TOKEN })
  });
  const { id: containerId } = await create.json();

  // Step 2: Publish container
  const publish = await fetch(`${GRAPH}/${IG_ID}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: containerId, access_token: TOKEN })
  });
  const data = await publish.json();
  console.log('Posted to Instagram:', data.id);
  return data.id;
}

// Get engagement summary for last 7 days
async function getEngagementSummary() {
  const resp = await fetch(
    `${GRAPH}/${PAGE_ID}/insights?metric=page_impressions,page_engaged_users,page_fans&period=week&access_token=${TOKEN}`
  );
  const data = await resp.json();
  return data.data || [];
}

module.exports = { postToFacebook, postToInstagram, getEngagementSummary };