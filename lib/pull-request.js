const jsonPath = require("JSONPath");
const mustache = require("mustache");
const Shared = require("./shared");


module.exports = class PullRequest {
    constructor(context, logger) {
        this.context = context;
        this.logger = logger;
    }


    async checkReadme() {

        this.logger("Checking to see if this looks like a new indexer and is missing a readme update");

        let needsReadmeUpdate = false;
        const files = await this.context.github.pullRequests.getFiles(this.context.issue());
        const params = this.context.issue();

        const indexersAdded = jsonPath.eval(files, "$.data[?(@.status=='added' && ( @.filename.includes('/Definitions/') || @.filename.includes('/Indexers/') ))]");
        const readmeInFiles = jsonPath.eval(files, "$.data[?(@.filename.includes('README.md'))]");

        if (indexersAdded != null && indexersAdded.length > 0 && readmeInFiles != null && readmeInFiles.length == 0) {
            needsReadmeUpdate = true;
        }

        if (needsReadmeUpdate) {

            const shared = new Shared(this.context, this.logger);
            const pullRequestTemplate = await shared.getTemplate(".github/pull_request_readme.md");

            const commentBody = mustache.render(pullRequestTemplate, {
                payload: this.context.payload
            });

            // Post a comment on the pull request
            await this.context.github.issues.createComment({
                owner: params.owner,
                repo: params.repo,
                number: this.context.payload.number,
                body: commentBody
            });

        }

    }
};


