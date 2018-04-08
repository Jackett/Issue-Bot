const jsonPath = require("JSONPath");
const Shared = require("./shared");


module.exports = class IssueComment {
    constructor(context, logger) {
        this.context = context;
        this.logger = logger;
    }


    async processIssueComment() {

        this.logger("Checking to see if this issue comment should reopen an issue or remove labels from an issue");

        const comment = this.context.payload.comment;
        const params = this.context.issue();
        const issueInfo = await this.context.github.issues.get(params);
        const issueCreator = jsonPath.eval(issueInfo, "$.data.user.login")[0].trim();
        const issueLabels = jsonPath.eval(issueInfo, "$.data.labels[*].name");
        const closedBy = jsonPath.eval(issueInfo, "$.data.closed_by.login");
        let wasClosedByBot = false;
        if (closedBy != null && closedBy.length > 0) {
            wasClosedByBot = closedBy[0].endsWith("[bot]");
        }

      
        //Only automatically reopen or de-label the issue if it's the original author commenting

        if (comment.user.login == issueCreator) {

            const shared = new Shared(this.context, this.logger);
            const noResponseLabels = shared.noResponseLabels;

            //Re-open the issue if its closed and was closed by the bot

            if (this.context.payload.issue.state != "open" && wasClosedByBot) {

                //Open the issue

                await this.context.github.issues.edit({
                    owner: params.owner,
                    repo: params.repo,
                    number: params.number,
                    state: "open"
                });

            }


            //Since its the original author commenting, see if there is any labels we should remove

            if (issueLabels != null && issueLabels.length > 0) {

                const self = this;

                var labelsToRemove = issueLabels.filter(function (n) {
                    return noResponseLabels.indexOf(n) !== -1;
                });

                labelsToRemove.forEach(async function (labelName) {

                    self.logger.info("%s/%s#%d%s is being unmarked", params.owner, params.repo, params.number, labelName);
                    await self.context.github.issues.removeLabel({
                        owner: params.owner,
                        repo: params.repo,
                        number: params.number,
                        name: labelName
                    });

                });

            }

        }

    }
};
