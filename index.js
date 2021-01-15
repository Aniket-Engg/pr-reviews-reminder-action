
const core = require('@actions/core');
const axios = require('axios');

const {
  getPullRequestsWithRequestedReviewers,
  prettyMessage,
} = require("./functions");

const GITHUB_API_URL = 'https://api.github.com';
const { GITHUB_TOKEN, GITHUB_REPOSITORY, GITTER_TOKEN } = process.env;
const AUTH_HEADER = {
  Authorization: `token ${GITHUB_TOKEN}`
};
const PULLS_ENDPOINT = `${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/pulls`;

function getPullRequests() {
  return axios({
    method: 'GET',
    url: PULLS_ENDPOINT,
    headers: AUTH_HEADER
  });
}

function sendNotification(webhookUrl, message) {
  console.log(message)
  return axios.post(webhookUrl, { text : message }, {headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${GITTER_TOKEN}`
    }})
}

async function main() {
  try {
    const webhookUrl = core.getInput('webhook-url');   
    core.info('Getting open pull requests...');
    const pullRequests = await getPullRequests();
    core.info(`There are ${pullRequests.data.length} open pull requests`);
    const pullRequestsWithRequestedReviewers = getPullRequestsWithRequestedReviewers(pullRequests.data);
    core.info(`There are ${pullRequestsWithRequestedReviewers.length} pull requests waiting for reviews`);
    if (pullRequestsWithRequestedReviewers.length) {
      const message = prettyMessage(pr2user, github2provider, provider);
      await sendNotification(webhookUrl, channel, message);
      core.info(`Notification sent successfully!`);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();
