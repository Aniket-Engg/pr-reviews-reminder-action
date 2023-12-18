
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
  const prs = getPullRequestsWithRequestedReviewers(pullRequests.data);
  core.info(`There are ${prs.length} pull requests waiting for reviews`);
  await sendNotification(webhookUrl, `There are ${prs.length} pull requests waiting for reviews under ${title} repo`);
  if (prs.length) {
    console.log(prs)
    let embeds = []
    for (let i=0; i < 10; i++) {
      const pr = prs[i]
      let embed = {}
      let reviewers = ''
      for (const user of pr.requested_reviewers)
        reviewers += ` @${user.login}`
      
      embed.title = pr.title
      embed.url = pr.html_url
      console.log('reviewers----->', reviewers)
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
    await sendNotification(webhookUrl, 'Hello Remix Team, a gentle request to review pending PRs')
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
