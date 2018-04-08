const mustache = require("mustache");
const Shared = require("./shared");


module.exports = class NoInfo {
    constructor(context, logger) {
        this.context = context;
        this.logger = logger;
    }


    async checkForInfo() {

        const shared = new Shared(this.context, this.logger);
        const issueTemplate = await shared.getTemplate(".github/ISSUE_TEMPLATE.md");

        //Remove spaces and line breaks to compare the text content
        const templateText = issueTemplate.trim().replace(/\s/g, "");
        const issueText = this.context.payload.issue.body.trim().replace(/\s/g, "");

        if (templateText == issueText || issueText == "") {

            //The issue creator has provided a blank body or only supplied exactly the template

            const noInfoTemplate = await shared.getTemplate(".github/no_information_provided.md");

            if (noInfoTemplate.length > 0) {

                const commentBody = mustache.render(noInfoTemplate, {
                    payload: this.context.payload
                });

                const params = this.context.issue({ body: commentBody });

                // Post a comment on the issue
                await this.context.github.issues.createComment(params);

                //Label as No details provided
                await this.context.github.issues.addLabels({ owner: params.owner, repo: params.repo, number: params.number, labels: ["No details provided"] });

                //Close the issue
                await this.context.github.issues.edit({ owner: params.owner, repo: params.repo, number: params.number, state: "closed" });

                return false;
            }
        }

        return true;
    }
};
