const mustache = require("mustache");
const moment = require("moment");
const Shared = require("./shared");


module.exports = class DuplicateCheck {
    constructor(context, logger) {
        this.context = context;
        this.logger = logger;
    }


    async isIssueDuplicate() {

        const oneMonthAgo = moment().subtract(1, "months");

        // Get all issues from the last month
        const params = this.context.issue();
        const allPages = await this.context.github.paginate(this.context.github.issues.getForRepo(
            ({ owner: params.owner, repo: params.repo, state: "all", since: oneMonthAgo.format() })), issues => issues);

        var issuesWithSameTitle = [];
        const thisIssueTitle = this.context.payload.issue.title.trim();

        if (thisIssueTitle.length < 10) {
            return false;
        }

        for (let page of allPages) {
            for (let issue of page.data) {
                //Find issues with exactly the same title and exlcude the current issue
                if (issue.title.trim() == thisIssueTitle && issue.number != this.context.payload.issue.number) {

                    var issueCreatedAt = issue.created_at;

                    //The 'since' paramter above looks at updated_at, which means the issue can go on forever, instead check the created_at date

                    if (moment(issueCreatedAt).isAfter(oneMonthAgo)) {
                        issuesWithSameTitle.push(issue);
                    }
                }
            }
        }

        if (issuesWithSameTitle.length > 0) {

            //Duplicate issues present, sort by state=open, then most comments, then oldest number (lowest)

            let sortedIssues = issuesWithSameTitle
                .sort(function (a, b) {
                    if (a.state == b.state) {
                        if (a.comments == b.comments) {
                            if (a.number < b.number)
                                return -1;
                            if (a.number > b.number)
                                return 1;
                        }
                        if (a.comments > b.comments)
                            return -1;
                        if (a.comments < b.comments)
                            return 1;
                    }
                    if (a.state == "open") {
                        return -1;
                    }
                    else {
                        return 1;
                    }
                });

            const chosenDuplicateIssue = sortedIssues[0];

            const shared = new Shared(this.context, this.logger);
            const duplicateTemplate = await shared.getTemplate(".github/duplicate_issue.md");

            if (duplicateTemplate.length > 0 && chosenDuplicateIssue != null) {

                const commentBody = mustache.render(duplicateTemplate, {
                    payload: this.context.payload, chosenIssue: chosenDuplicateIssue
                });

                const params = this.context.issue({ body: commentBody });

                // Post a comment on the issue
                await this.context.github.issues.createComment(params);

                //Label as duplicate
                await this.context.github.issues.addLabels({ owner: params.owner, repo: params.repo, number: params.number, labels: ["Duplicate"] });

                //Close the issue
                await this.context.github.issues.edit({ owner: params.owner, repo: params.repo, number: params.number, state: "closed" });

                return true;
            }
        }

        return false;
    }
};
