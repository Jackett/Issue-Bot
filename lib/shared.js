module.exports = class Shared {
    constructor(context, logger) {
        this.context = context;
        this.logger = logger;
        this.noResponseLabels = ["More information needed", "No details provided", "Full logs needed"];
        this.daysUntilNoResponseClosed = 7;
    }


    async getTemplate(path) {

        let template;

        try {
            // Try to get no information template from the repository
            const params = this.context.repo({ path: path });
            const data = await this.context.github.repos.getContent(params);
            template = Buffer.from(data.data.content, "base64").toString();
        } catch (err) {
            template = "";
        }

        return template;
    }

}
