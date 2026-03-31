require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL    = 'http://localhost:20128/v1';
const MODEL       = 'kr/qwen3-coder-next';
const ROUTER_KEY  = process.env.ROUTER_API_KEY;
const LI_TOKEN    = process.env.LINKEDIN_ACCESS_TOKEN;
const LI_PERSON   = process.env.LINKEDIN_PERSON_URN; // urn:li:person:XXXXX

// 1. Generate post content with AI
async function generatePost(topic) {
  const resp = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ROUTER_KEY}`
    },
    body: JSON.stringify({
      model:  MODEL,
      stream: false,
      messages: [
        { role: 'system', content: 'You write concise, engaging LinkedIn posts for a business. No hashtag spam. Max 200 words. Professional but human tone.' },
        { role: 'user',   content: `Write a LinkedIn post about: ${topic}` }
      ],
      max_tokens: 400
    })
  });
  const data = await resp.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

// 2. Post to LinkedIn Share API
async function postToLinkedIn(text) {
  const resp = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Content-Type':     'application/json',
      'Authorization':    `Bearer ${LI_TOKEN}`,
      'X-Restli-Protocol-Version': '2.0.0'
    },
    body: JSON.stringify({
      author:          LI_PERSON,
      lifecycleState:  'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary:   { text },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    })
  });
  if (!resp.ok) throw new Error(`LinkedIn API error: ${resp.status}`);
  console.log('Posted to LinkedIn successfully');
}

// Main exported function
async function runLinkedInPoster(topic) {
  console.log('Generating LinkedIn post for topic:', topic);
  const post = await generatePost(topic);
  console.log('Generated:\n', post);
  await postToLinkedIn(post);
}

module.exports = { runLinkedInPoster };