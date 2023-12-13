function getPullRequestsWithRequestedReviewers(pullRequests) {
  return pullRequests.filter(pr => pr.requested_reviewers.length);
}

module.exports = {
  getPullRequestsWithRequestedReviewers,
};
