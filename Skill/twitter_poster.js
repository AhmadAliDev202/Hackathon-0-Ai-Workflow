require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');

const client = new TwitterApi({
  appKey:            process.env.TWITTER_API_KEY,
  appSecret:         process.env.TWITTER_API_SECRET,
  accessToken:       process.env.TWITTER_ACCESS_TOKEN,
  accessSecret:      process.env.TWITTER_ACCESS_SECRET,
});
const rwClient = client.readWrite();

async function postTweet(text) {
  const tweet = await rwClient.v2.tweet(text);
  console.log('Tweet posted:', tweet.data.id);
  return tweet.data.id;
}

async function getTwitterSummary() {
  const me = await rwClient.v2.me({ 'user.fields': ['public_metrics'] });
  return {
    followers:  me.data.public_metrics.followers_count,
    following:  me.data.public_metrics.following_count,
    tweets:     me.data.public_metrics.tweet_count
  };
}

module.exports = { postTweet, getTwitterSummary };