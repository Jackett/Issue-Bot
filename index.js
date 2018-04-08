const createScheduler = require("probot-scheduler");
const DuplicateCheck = require("./lib/duplicate-check");
const NoInfo = require("./lib/no-info");
const IssueComment = require("./lib/issue-comment");
const NoResponse = require("./lib/no-response");
const PullRequest = require("./lib/pull-request");


module.exports = async (robot) => {

    robot.log("The app was loaded!");

    createScheduler(robot);


    robot.on("issues.opened", async context => {

        robot.log("New issue created");

        //Check if the issue is a duplicate based on the title
        const duplicateCheck = new DuplicateCheck(context, robot.log);
        const issueIsDuplicate = await duplicateCheck.isIssueDuplicate();

        //If the issue wasn't a duplicate
        if (!issueIsDuplicate) {
            //Check to see if the issue creator has provided any details
            const noInfo = new NoInfo(context, robot.log);
            await noInfo.checkForInfo();
        }

    });


    robot.on("issue_comment", async context => {

        robot.log("Issue comment");

        //Re-open check: If JackettBot originally closed the issue, check to see if it should be re-opened
        const issueComment = new IssueComment(context, robot.log);
        await issueComment.processIssueComment();

    });


    robot.on("schedule.repository", async context => {
        // this event is triggered on an interval, which is 1 hr by default

        robot.log("Scheduled trigger");

        const noResponse = new NoResponse(context, robot.log);
        await noResponse.sweep();

    });


    robot.on("pull_request.opened", async context => {

        robot.log("Pull request created");

        const pullRequest = new PullRequest(context, robot.log);
        await pullRequest.checkReadme();

    });

};
