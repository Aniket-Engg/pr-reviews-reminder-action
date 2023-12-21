
const core = require('@actions/core');
const axios = require('axios');

const {
  getPullRequestsWithRequestedReviewers,
} = require("./functions");

const GITHUB_API_URL = 'https://api.github.com';
const { GITHUB_TOKEN, GITHUB_REPOSITORY } = process.env;
const AUTH_HEADER = {
  Authorization: `token ${GITHUB_TOKEN}`
};
const PULLS_ENDPOINT = `${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/pulls`;

const discordIDs = {
  'Aniket-Engg' : '621970622716575747',
  'yann300': '425335058652463117',
  'bunsenstraat': '660074606539046915',
  'joeizang': '629376310812344330',
  'vermouth22': '678640402261082132',
  'STetsing': '802198368340017153'
}

const emojis = {
  '3' : "🙄",
  '4' : "🫣",
  '5' : "😲",
  '6' : "😱"
}

function getPullRequests(endPoint) {
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
  const pullRequests = await getPullRequests(pulls_endpoint);
  const prs = getPullRequestsWithRequestedReviewers(pullRequests.data);
  core.info(`There are ${prs.length} pull requests waiting for reviews`);
  if (prs.length) {
    let message = ''
    for (let i=0; i < prs.length; i++) {
      const pr = prs[i]      
      let reviewers = ''
      for (const user of pr.requested_reviewers)
        reviewers += ` <@${discordIDs[user.login] || user.login}>`

      message += `<[${pr.title}](${pr.html_url})>, Reviewers: ${reviewers}`
      const seconds = Date.now() - new Date(pr.created_at)
      const pendingWeeks = Math.round(seconds/604800000)
      if (pendingWeeks >= 3) message += `${emojis[pendingWeeks] || "🤯"} **(Pending for ${pendingWeeks} weeks)** ${emojis[pendingWeeks] || "🤯"}`
      message += '\n'
    }
    await sendNotification(webhookUrl, message);
    await sendNotification(webhookUrl, `@everyone 🎗️ A gentle reminder to review **${prs.length} pending PRs** under __${title}__ repo.`);
    core.info(`Notification sent successfully!`);
  }
}

async function main() {
  try {
    const webhookUrl = core.getInput('webhook-url');   
    core.info('Getting open pull requests...');
    await doRepo(PULLS_ENDPOINT, webhookUrl, 'remix-project')
    await doRepo(`${GITHUB_API_URL}/repos/ethereum/remix-plugins-directory/pulls`, webhookUrl, 'remix-plugins-directory')
    await doRepo(`${GITHUB_API_URL}/repos/ethereum/remix-ide/pulls`, webhookUrl, 'remix-ide')
    await doRepo(`${GITHUB_API_URL}/repos/ethereum/remix-desktop/pulls`, webhookUrl, 'remix-desktop')   
  } catch (error) {
    core.error(error)
    core.setFailed(error.message);
  }
}

main();
