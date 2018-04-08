const mustache = require("mustache");
const scramjet = require("scramjet");
const Shared = require("./shared");


module.exports = class NoResponse {
    constructor(context, logger) {
        this.context = context;
        this.logger = logger;
    }


    async sweep() {

        this.logger.info("Starting sweep");
        const shared = new Shared(this.context, this.logger);
        const noResponseLabels = shared.noResponseLabels;
        var daysToRespond = shared.daysUntilNoResponseClosed;
        var self = this;

        noResponseLabels.forEach(async function (labelName) {

            const issues = await self.getClosableIssues(labelName, daysToRespond);
            issues.forEach(issue => self.close(self.context.repo({ number: issue.number })));

        });

        this.logger.info("Finished sweep");
    }


    async getClosableIssues(labelName, daysUntilClose) {

        const { owner, repo } = this.context.repo();
        const q = `repo:${owner}/${repo} is:issue is:open label:"${labelName}"`;
        const params = { q, sort: "updated", order: "desc", per_page: 30 };
        const labeledEarlierThan = this.since(daysUntilClose);

        const issues = await this.context.github.search.issues(params);

        const closableIssues = scramjet.fromArray(issues.data.items).filter(async issue => {
            const event = await this.findLastLabeledEvent(owner, repo, issue.number, labelName);
            const creationDate = new Date(event.created_at);
            return creationDate < labeledEarlierThan;
        }).toArray();

        return closableIssues;
    }


    async close(issue) {

        const { owner, repo } = this.context.repo();
        const shared = new Shared(this.context, this.logger);
        const issueInfo = await this.context.github.issues.get({ owner: owner, repo: repo, number: issue.number });
        const noResponseTemplate = await shared.getTemplate(".github/no_response.md");

        const commentBody = mustache.render(noResponseTemplate, {
            payload: issueInfo, days: shared.daysUntilNoResponseClosed
        });

        this.logger.info("%s/%s#%d is being closed", owner, repo, issue.number);

        // Post a comment on the issue
        await this.context.github.issues.createComment({ owner: owner, repo: repo, number: issue.number, body: commentBody });

        //Close the issue
        await this.context.github.issues.edit({ owner: owner, repo: repo, number: issue.number, state: "closed" });
    }


    async findLastLabeledEvent(owner, repo, number, labelName) {
        const params = { owner, repo, issue_number: number, per_page: 100 };
        const events = await this.context.github.paginate(this.context.github.issues.getEvents(params));
        return events[0].data.reverse()
            .find(event => event.event === "labeled" && event.label.name == labelName);
    }


    since(days) {
        const ttl = days * 24 * 60 * 60 * 1000;
        return new Date(new Date() - ttl);
    }
};
