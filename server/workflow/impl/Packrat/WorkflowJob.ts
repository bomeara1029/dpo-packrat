/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types, no-constant-condition */
import * as WF from '../../interface';
import { WorkflowUtil, WorkflowUtilExtractAssetVersions } from './WorkflowUtil';
import * as JOB from '../../../job/interface';
import * as REP from '../../../report/interface';
import * as DBAPI from '../../../db';
import * as CACHE from '../../../cache';
import * as COMMON from '@dpo-packrat/common';
import * as LOG from '../../../utils/logger';
import * as H from '../../../utils/helpers';
import { Mutex, MutexInterface, withTimeout, E_TIMEOUT, E_CANCELED } from 'async-mutex';

export class WorkflowJobParameters {
    eCookJob: COMMON.eVocabularyID;
    cookJobParameters: any;

    constructor(eCookJob: COMMON.eVocabularyID, cookJobParameters: any) {
        this.eCookJob = eCookJob;
        this.cookJobParameters = cookJobParameters;
    }
}

// This Workflow executes a Job, such as a Cook recipe
// It has a single step, "start", which launches the specified Job
// update() will likely terminate the workflow in response to the underlying job having finished
export class WorkflowJob implements WF.IWorkflow {
    private workflowParams: WF.WorkflowParameters;
    private workflowData: DBAPI.WorkflowConstellation;
    private workflowJobParameters: WorkflowJobParameters | null = null;
    private workflowReport: REP.IReport | null = null;
    private idAssetVersions: number[] | null = null;
    private completionMutexes: MutexInterface[] = [];
    private complete: boolean = false;
    private results: H.IOResults = { success: false, error: 'Workflow Job Not Initialized' };

    static async constructWorkflow(workflowParams: WF.WorkflowParameters, WFC: DBAPI.WorkflowConstellation): Promise<WorkflowJob | null> {
        const workflowJob: WorkflowJob = new WorkflowJob(workflowParams, WFC);
        const res: H.IOResults = await workflowJob.extractParameters();
        if (!res.success)
            return null;
        return workflowJob;
    }

    constructor(workflowParams: WF.WorkflowParameters, workflowData: DBAPI.WorkflowConstellation) {
        this.workflowParams = workflowParams;
        this.workflowData = workflowData;
    }

    async start(): Promise<H.IOResults> {
        if (!await this.extractParameters())
            return { success: false, error: 'Invalid Job Parameters' };

        if (!this.workflowJobParameters)
            return { success: false, error: 'Invalid Job Parameters' };

        // fetch workflow report
        if (!this.workflowReport) {
            this.workflowReport = await REP.ReportFactory.getReport();
            if (!this.workflowReport) {
                const error: string = 'WorkflowJob.start unable to create/fetch workflow report';
                LOG.error(error, LOG.LS.eWF);
                // return { success: false, error };
            }
        }

        // fetch IJobEngine; use IJobEngine to create IJob; use IJob to start job
        // expect job to update WorkflowStep
        const jobEngine: JOB.IJobEngine | null = await JOB.JobFactory.getInstance();
        if (!jobEngine) {
            const error: string = 'WorkflowJob.start unable to fetch JobEngine';
            LOG.error(error, LOG.LS.eWF);
            return { success: false, error };
        }

        const jobCreationParameters: JOB.JobCreationParameters = {
            idJob: null,
            eJobType: this.workflowJobParameters.eCookJob,
            idAssetVersions: this.idAssetVersions,
            report: this.workflowReport,
            parameters: this.workflowJobParameters.cookJobParameters,
            frequency: null               // null means create but don't run
        };

        const job: JOB.IJob | null = await jobEngine.create(jobCreationParameters);
        if (!job) {
            const error: string = `WorkflowJob.start unable to start job ${jobCreationParameters.eJobType
                ? COMMON.eVocabularyID[jobCreationParameters.eJobType] : 'undefined'}`;
            LOG.error(error, LOG.LS.eWF);
            return { success: false, error };
        }

        // link WorkflowStep to JobRun
        const jobRunDB: DBAPI.JobRun | null = await job.dbJobRun();
        if (!jobRunDB) {
            const error: string = `WorkflowJob.start unable to fetch JobRun DB ${jobCreationParameters.eJobType
                ? COMMON.eVocabularyID[jobCreationParameters.eJobType] : 'undefined'}`;
            LOG.error(error, LOG.LS.eWF);
            return { success: false, error };
        }

        if (this.workflowData.workflowStep) {
            for (const workflowStep of this.workflowData.workflowStep) {
                if (workflowStep) {
                    workflowStep.idJobRun = jobRunDB.idJobRun;
                    await workflowStep.update();
                }
            }
        }

        // start job asynchronously, by not using await, so that we remain unblocked:
        job.executeJob(new Date());
        return { success: true };
    }

    async update(workflowStep: DBAPI.WorkflowStep, jobRun: DBAPI.JobRun): Promise<WF.WorkflowUpdateResults> {
        // update workflowStep based on job run data
        const eWorkflowStepStateOrig: COMMON.eWorkflowJobRunStatus = workflowStep.getState();
        switch (eWorkflowStepStateOrig) {
            case COMMON.eWorkflowJobRunStatus.eDone:
            case COMMON.eWorkflowJobRunStatus.eError:
            case COMMON.eWorkflowJobRunStatus.eCancelled:
                LOG.info(`WorkflowJob.update ${JSON.stringify(this.workflowJobParameters)}: ${jobRun.idJobRun} Already Completed`, LOG.LS.eWF);
                return { success: true, workflowComplete: true }; // job is already done
        }

        let dateCompleted: Date | null = null;
        let updateWFSNeeded: boolean = false;
        let workflowComplete: boolean = false;

        const eWorkflowStepState: COMMON.eWorkflowJobRunStatus = jobRun.getStatus();
        switch (eWorkflowStepState) {
            case COMMON.eWorkflowJobRunStatus.eDone:
                dateCompleted = new Date();
                this.results = { success: true };
                break;
            case COMMON.eWorkflowJobRunStatus.eError:
            case COMMON.eWorkflowJobRunStatus.eCancelled:
                dateCompleted = new Date();
                this.results = { success: false, error: jobRun.Error || '' };
                break;
        }

        if (eWorkflowStepState != eWorkflowStepStateOrig) {
            workflowStep.setState(eWorkflowStepState);
            updateWFSNeeded = true;
        }

        if (dateCompleted) {
            workflowStep.DateCompleted = dateCompleted;
            updateWFSNeeded = true;

            if (this.workflowData.workflow) {
                this.workflowData.workflow.DateUpdated = dateCompleted;
                workflowComplete = true;
            }
        }

        let dbUpdateResult: boolean = true;

        if (updateWFSNeeded)
            dbUpdateResult = await workflowStep.update() && dbUpdateResult;
        if (workflowComplete && this.workflowData.workflow)
            dbUpdateResult = await this.workflowData.workflow.update() && dbUpdateResult;

        if (workflowComplete) {
            LOG.info(`WorkflowJob.update releasing ${this.completionMutexes.length} waiter(s) ${JSON.stringify(this.workflowJobParameters)}: ${jobRun.idJobRun} ${COMMON.eWorkflowJobRunStatus[jobRun.getStatus()]} -> ${COMMON.eWorkflowJobRunStatus[eWorkflowStepState]}`, LOG.LS.eWF);
            this.signalCompletion();
        } else
            LOG.info(`WorkflowJob.update ${JSON.stringify(this.workflowJobParameters)}: ${jobRun.idJobRun} ${COMMON.eWorkflowJobRunStatus[jobRun.getStatus()]} -> ${COMMON.eWorkflowJobRunStatus[eWorkflowStepState]}`, LOG.LS.eWF);
        // LOG.error(`WorkflowJob.update ${JSON.stringify(this.workflowJobParameters)}: ${JSON.stringify(jobRun)} - ${JSON.stringify(workflowStep)}`, new Error(), LOG.LS.eWF);

        return (dbUpdateResult) ? { success: true, workflowComplete } : { success: false, workflowComplete, error: 'Database Error' };
    }

    async updateStatus(eStatus: COMMON.eWorkflowJobRunStatus): Promise<WF.WorkflowUpdateResults> {
        const workflowComplete: boolean = (eStatus === COMMON.eWorkflowJobRunStatus.eDone
            || eStatus === COMMON.eWorkflowJobRunStatus.eError
            || eStatus === COMMON.eWorkflowJobRunStatus.eCancelled);

        const workflowStep: DBAPI.WorkflowStep | null = (!this.workflowData.workflowStep || this.workflowData.workflowStep.length <= 0)
            ? null : this.workflowData.workflowStep[this.workflowData.workflowStep.length - 1];

        if (!workflowStep)
            return { success: false, workflowComplete, error: 'Missing WorkflowStep' };
        workflowStep.setState(eStatus);
        const success: boolean = await workflowStep.update();
        return { success, workflowComplete, error: success ? '' : 'Database Error' };
    }

    signalCompletion() {
        this.complete = true;
        for (const mutex of this.completionMutexes)
            mutex.cancel();
    }

    async waitForCompletion(timeout: number): Promise<H.IOResults> {
        if (this.complete)
            return this.results;
        const waitMutex: MutexInterface = withTimeout(new Mutex(), timeout);
        this.completionMutexes.push(waitMutex);

        const releaseOuter = await waitMutex.acquire();     // first acquire should succeed
        try {
            const releaseInner = await waitMutex.acquire(); // second acquire should wait
            releaseInner();
        } catch (error) {
            if (error === E_CANCELED)                   // we're done -- cancel comes from signalCompletion()
                return this.results;
            else if (error === E_TIMEOUT)               // we timed out
                return { success: false, error: `WorkflowJob.waitForCompletion timed out after ${timeout}ms` };
            else
                return { success: false, error: `WorkflowJob.waitForCompletion failure: ${JSON.stringify(error)}` };
        } finally {
            releaseOuter();
        }
        return this.results;
    }

    async workflowConstellation(): Promise<DBAPI.WorkflowConstellation | null> {
        return this.workflowData;
    }

    async extractParameters(): Promise<H.IOResults> {
        // confirm that this.workflowParams.parameters is valid
        if (!(this.workflowParams.parameters instanceof WorkflowJobParameters)) {
            const error: string = `WorkflowJob.start called with parameters not of type WorkflowJobParameters: ${JSON.stringify(this.workflowParams.parameters)}`;
            LOG.error(error, LOG.LS.eWF);
            return { success: false, error };
        }

        this.workflowJobParameters = this.workflowParams.parameters;

        // confirm job type is a really a Job type
        const eJobType: COMMON.eVocabularyID = this.workflowJobParameters.eCookJob;
        if (!await CACHE.VocabularyCache.isVocabularyInSet(eJobType, COMMON.eVocabularySetID.eJobJobType)) {
            const error: string = `WorkflowJob.start called with parameters not of type WorkflowJobParameters: ${JSON.stringify(this.workflowJobParameters)}`;
            LOG.error(error, LOG.LS.eWF);
            return { success: false, error };
        }

        // confirm that this.workflowParams.idSystemObject are asset versions; ultimately, we will want to allow a model and/or capture data, depending on the recipe
        if (!this.workflowParams.idSystemObject)
            return { success: true }; // OK to call without objects to act on, at least at this point -- the job itself may complain once started

        const WFUVersion: WorkflowUtilExtractAssetVersions = await WorkflowUtil.extractAssetVersions(this.workflowParams.idSystemObject);
        if (!WFUVersion.success)
            return { success: false, error: WFUVersion.error };

        this.idAssetVersions = WFUVersion.idAssetVersions;
        return { success: true };
    }
}