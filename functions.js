function getPullRequestsWithRequestedReviewers(pullRequests) {
  return pullRequests.filter(pr => pr.requested_reviewers.length);
}

function prettyMessage(prs) {
  let message = 'Hey guys, just a tiny reminder about PRs that need review\n';
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
  createPr2UserArray,
  prettyMessage
};
