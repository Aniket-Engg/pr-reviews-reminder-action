
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

function getPullRequests(endPoint) {
  console.log('getPullRequests--endPoint->', endPoint)
  return axios({
    method: 'GET',
    url: endPoint,
    headers: AUTH_HEADER
  });
}

function sendNotification(webhookUrl, message) {
  console.log(message)
  console.log(message)
  return axios.post(webhookUrl, { text : message }, { headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
      // 'Authorization': `Bearer ${GITTER_TOKEN}`
    }})
}

async function doRepo(pulls_endpoint, webhookUrl, title) {
  core.info('doRepo--pulls_endpoint->', pulls_endpoint)
  const pullRequests = await getPullRequests(pulls_endpoint);
  core.info(`There are ${pullRequests.data.length} open pull requests`);
  const pullRequestsWithRequestedReviewers = getPullRequestsWithRequestedReviewers(pullRequests.data);
  core.info(`There are ${pullRequestsWithRequestedReviewers.length} pull requests waiting for reviews`);
  if (pullRequestsWithRequestedReviewers.length) {
    const message = prettyMessage(pullRequestsWithRequestedReviewers, title);
    await sendNotification(webhookUrl, message);
    core.info(`Notification sent successfully!`);
  }
}

async function main() {
  try {
    core.info('inside main');
    const webhookUrl = core.getInput('webhook-url');   
    await sendNotification(webhookUrl, 'Hey guys! just a tiny reminder about PRs that need review')
    core.info('Getting open pull requests...');
    await doRepo(PULLS_ENDPOINT, webhookUrl, 'remix-project')
    await doRepo(`${GITHUB_API_URL}/repos/ethereum/remix-plugins-directory/pulls`, webhookUrl, 'remix-plugins-directory')
    await doRepo(`${GITHUB_API_URL}/repos/ethereum/remix-ide/pulls`, webhookUrl, 'remix-ide (documentation)')
    await doRepo(`${GITHUB_API_URL}/repos/ethereum/remix-desktop/pulls`, webhookUrl, 'remix-desktop')   
    await sendNotification(webhookUrl, '#### Before starting your task for the day, please use the first 30 mins from your work hours to review pending PRs assigned to you.')
  } catch (error) {
    core.error(error)
    core.setFailed(error.message);
  }
}

main();
