# Pull Request reviews reminder action
[![](https://github.com/davideviolante/pr-reviews-reminder-action/workflows/Node.js%20CI/badge.svg)](https://github.com/DavideViolante/pr-reviews-reminder-action/actions?query=workflow%3A%22Node.js+CI%22)

Action to send discord notifications when there are pull requests pending for reviews 3 days before a set date (usually feature freeze date).

## Inputs

### webhook-url

The webhook URL (required)

### freeze-date

Feature freeze date (required, if not set, notifications will not be sent)

## Example usage

```yaml
name: PRs reviews reminder

on:
  schedule:
    # Every weekday every 8 hours during working hours, send notification
    - cron: "0 8-17/8 * * 1-5"

jobs:
  pr-reviews-reminder:
    runs-on: ubuntu-latest
    steps:
    - uses: Aniket-Engg/pr-reviews-reminder-action@master
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        webhook-url: ${{ secrets.DISCORD_WEBHOOK_URL }} # Required
        freeze-date: '2024-01-01T00:00:00Z'
```


