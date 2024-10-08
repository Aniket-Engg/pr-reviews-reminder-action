
const core = require('@actions/core');
const axios = require('axios');
const { graphql } = require("@octokit/graphql")

const GITHUB_API_URL = 'https://api.github.com';
const { GITHUB_TOKEN, GITHUB_REPOSITORY } = process.env;
const AUTH_HEADER = {
  Authorization: `token ${GITHUB_TOKEN}`
};
const PULLS_ENDPOINT = `${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/pulls`;

const query = `
{
  repository(owner: "ethereum", name: "remix-project") {
    pullRequests(last:20, states: OPEN) {
      totalCount
      edges {
        node {
          title
          createdAt
          url
          state
          projectCards (last: 3)
          { 
            totalCount
          }
          reviewRequests {
            totalCount
          }
          reviews {
            totalCount
          }
          isDraft
          author {
            login
          }
        }
      }
    }
  }
}
`

const discordIDs = {
  'Aniket-Engg' : '621970622716575747',
  'yann300': '425335058652463117',
  'bunsenstraat': '660074606539046915',
  'joeizang': '629376310812344330',
  'vermouth22': '678640402261082132',
  'STetsing': '802198368340017153',
  'ryestew': '425257671336394754',
  'LianaHus': '426140880618127360'
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

async function sendReminderToReview(pulls_endpoint, webhookUrl, title, remainingDays) {
  const pullRequests = await getPullRequests(pulls_endpoint);
  const prs = pullRequests.data.filter(pr => pr.requested_reviewers.length);
  core.info(`There are ${prs.length} pull requests waiting for reviews`);
  if (prs.length) {
    let message = ''
    for (let i=0; i < prs.length; i++) {
      console.log('sendReminderToReview message length:', message.length)
      if (message.length > 1800) {
        await sendNotification(webhookUrl, message);
        message = ''
      }
      const pr = prs[i] 
      const wipLabelIndex = pr.labels.findIndex(labelObj => labelObj.name === 'WIP')
      if (wipLabelIndex > -1) continue   
      let reviewers = ''
      for (const user of pr.requested_reviewers)
        reviewers += ` <@${discordIDs[user.login] || user.login}>`

      message += `- <[${pr.title}](${pr.html_url})>, __Reviewers:__ ${reviewers}`
      const seconds = Date.now() - new Date(pr.created_at)
      const pendingWeeks = Math.round(seconds/604800000)
      if (pendingWeeks >= 3) message += `, **(Pending for ${pendingWeeks} weeks)** ${emojis[pendingWeeks] || "🤯"}`
      message += '\n'
    }
    await sendNotification(webhookUrl, message);
    const infoMsg = remainingDays === 0 ? '💥💥 WE HAVE FEATURE FREEZE TODAY 💥💥 Please REVIEW & MERGE PRs ASAP to avoid delay in quick release.' : `💥 THIS IS IMPORTANT 💥 Only **${remainingDays} days left** in FEATURE FREEZE. Have a look to 👆 PRs from __${title}__ .`
    await sendNotification(webhookUrl, `🌄 Morning @everyone , ${infoMsg}`);
    core.info(`sendReminderToReview sent successfully!`);
  }
}

async function sendReminderForProjectAndReviewers(webhookUrl) {
  const { repository } = await graphql(query, { headers: AUTH_HEADER})
  let message = `🌅 Morning @everyone, See the PRs having no project and/or reviewers assigned yet and PLEASE TAKE APPROPRIATE ACTION:\n`
  for (const e of repository.pullRequests.edges) {
    console.log('sendReminderForProjectAndReviewers message length:', message.length)
    if (message.length > 1800) {
      await sendNotification(webhookUrl, message);
      message = ''
    }
    const { node } = e
    const seconds = Date.now() - new Date(node.createdAt)
    const pendingWeeks = Math.round(seconds/604800000)
    if (pendingWeeks >= 1 && !node.isDraft && (node.projectCards.totalCount === 0 || (node.reviewRequests.totalCount === 0 && node.reviews.totalCount === 0))) {
      message += `- <@${discordIDs[node.author.login] || node.author.login}> <[${node.title}](${node.url})> , Opened **${pendingWeeks} weeks** ago,`
      message += `${node.projectCards.totalCount === 0 ? ' __No Project__' : ''}`
      message += `${(node.reviewRequests.totalCount === 0 && node.reviews.totalCount === 0) ? ' & __No Reviewers__' : ''}`
      message += ` Assigned`
      message += '\n'
    }
  }
  await sendNotification(webhookUrl, message);
  core.info(`sendReminderForProjectAndReviewers done successfully!`);
}

async function checkServices() {
  const webhookUrl = core.getInput('sc-webhook-url');
  if (webhookUrl) {
    const servicesDetails = await axios.get('https://status.remixproject.org:7777/servicestatus.json')
    let failedServices = []
    for (const service of servicesDetails.data) {
      if(service.status === 'false') failedServices.push(service.name)
    }
    if (failedServices.length) await sendNotification(webhookUrl, `👉 @everyone **${failedServices.join(', ')}** services are down! 😱😱`)
  }  
}

async function main() {
  try {
    const webhookUrl = core.getInput('webhook-url');   
    const freezeDate = core.getInput('freeze-date');
    if (webhookUrl && freezeDate) {
      const ffDate = new Date(freezeDate)
      const today = Date.now()
      if (ffDate < today) {
        const seconds = today - ffDate
        const passedDays = Math.round(seconds/86400000)
        if (passedDays >= 2) await sendNotification(webhookUrl, `👉 Dear release manager, ${passedDays} days passed from previous feature freeze. Please set a new date`);
      }
      else if (ffDate > today) {
        const seconds = ffDate - today
        const remainingDays = Math.round(seconds/86400000)
        if (remainingDays > 5 && remainingDays % 3 === 0) 
          await sendReminderForProjectAndReviewers(webhookUrl)
        else {
          core.info('Getting open pull requests...');
          await sendReminderToReview(PULLS_ENDPOINT, webhookUrl, 'remix-project', remainingDays)
          await sendReminderToReview(`${GITHUB_API_URL}/repos/ethereum/remix-plugins-directory/pulls`, webhookUrl, 'remix-plugins-directory', remainingDays)
          await sendReminderToReview(`${GITHUB_API_URL}/repos/ethereum/remix-ide/pulls`, webhookUrl, 'remix-ide', remainingDays)
          await sendReminderToReview(`${GITHUB_API_URL}/repos/ethereum/remix-desktop/pulls`, webhookUrl, 'remix-desktop', remainingDays)  
        }
      } 
    }   
  } catch (error) {
    core.error(error)
    core.setFailed(error.message);
  }
}

main();
checkServices();
