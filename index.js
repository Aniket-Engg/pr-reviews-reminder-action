
const core = require('@actions/core');
const axios = require('axios');

const {
  getPullRequestsWithRequestedReviewers,
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
    return axios.post(webhookUrl, { content : message }, { headers: {
      'Content-Type': 'application/json'
    }})
}

function sendEmbeds(webhookUrl, embeds) {
  console.log('sendEmbeds--embeds->', embeds)
  return axios({
    method: 'POST',
    url: webhookUrl,
    headers: {
      'Content-Type': 'application/json'
    } ,
    data: JSON.stringify({ embeds })
  })
}

async function doRepo(pulls_endpoint, webhookUrl, title) {
  core.info('doRepo--pulls_endpoint->', pulls_endpoint)
  const pullRequests = await getPullRequests(pulls_endpoint);
  await sendNotification(webhookUrl, `Hey guys! There are ${pullRequests.data.length} open pull requests`);
  const prs = getPullRequestsWithRequestedReviewers(pullRequests.data);
  core.info(`There are ${prs.length} pull requests waiting for reviews`);
  if (prs.length) {
    console.log(prs)
    let embeds = []
    for (const pr of prs) {
      let embed = {}
      let reviewers = null
      for (const user of pr.requested_reviewers)
        reviewers += ` @${user.login}`
      
      embed.title = title
      embed.url = pr.html_url
      embed.fields = [{
        name: "Review required by:",
        value: reviewers
      }]
      console.log('embed--->', embed)
      embeds.push(embed)
    }
    await sendEmbeds(webhookUrl, embeds);
    core.info(`Notification sent successfully!`);
  }
}

async function main() {
  try {
    core.info('inside main');
    const webhookUrl = core.getInput('webhook-url');   
    // await sendNotification(webhookUrl, 'Hey guys! just a tiny reminder about PRs that need review')
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
