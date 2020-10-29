const rp = require('request-promise');
const _ = require('lodash');

class GithubRestUtils {
    static commonPostOptions() {
        return {
            method: 'POST',
            headers: {
                'User-Agent': 'request'
            },
            body: {
                accept: 'application/vnd.github.v3+json',
            },
            json: true
        };
    }
    static createPullRequest(baseName, data = {}, {username, token}) {
        const config = _.merge({},
            GithubRestUtils.commonPostOptions(),
            {
                uri: `https://${username}:${token}@api.github.com/repos/${baseName}/pulls`,
                body: {
                    ...data
                },
            });
        return rp(config);
    }

    static setAssignees(baseName, prNumber, assignees, {username, token}) {
        const config = _.merge({},
            GithubRestUtils.commonPostOptions(),
            {
                uri: `https://${username}:${token}@api.github.com/repos/${baseName}/issues/${prNumber}/assignees`,
                body: {
                    assignees
                },
            });
        return rp(config);
    }
}

module.exports = GithubRestUtils;