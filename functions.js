function getPullRequestsWithRequestedReviewers(pullRequests) {
  return pullRequests.filter(pr => pr.requested_reviewers.length);
}

function prettyMessage(prs, title) {
  let message = title + '\n';
  for (const pr of prs) {
      message += `[${pr.html_url}](${pr.html_url}) - `
      for (const user of pr.requested_reviewers) {
          message += ` @${user.login}`
      }
      message += '\n'
  }
  return message;
}

module.exports = {
  getPullRequestsWithRequestedReviewers,
  prettyMessage
};
