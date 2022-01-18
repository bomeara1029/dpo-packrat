import * as WF from '../../interface';
import { WorkflowUtil, WorkflowUtilExtractAssetVersions } from './WorkflowUtil';
import { WorkflowJobParameters } from './WorkflowJob';
import * as COOK from '../../../job/impl/Cook';
import * as DBAPI from '../../../db';
import * as CACHE from '../../../cache';
import * as STORE from '../../../storage/interface';
import * as REP from '../../../report/interface';
import * as LOG from '../../../utils/logger';
import * as H from '../../../utils/helpers';
import { ZipStream } from '../../../utils/zipStream';
import { SvxReader } from '../../../utils/parser';

// import * as sharp from 'sharp';
import sharp from 'sharp';
import * as path from 'path';

// This Workflow represents an upload action, typically initiated by a user.
// The workflow itself performs no actual upload work (upload is performed in the graphQl uploadData routine)
// Instead, this workflow provide a means for gathering ingestion report output
export class WorkflowUpload implements WF.IWorkflow {
    private workflowParams: WF.WorkflowParameters;
    private workflowData: DBAPI.WorkflowConstellation;
    private workflowReport: REP.IReport | null = null;
    private results: H.IOResults = { success: true };

    static async constructWorkflow(workflowParams: WF.WorkflowParameters, WFC: DBAPI.WorkflowConstellation): Promise<WorkflowUpload | null> {
        return new WorkflowUpload(workflowParams, WFC);
    }

    constructor(workflowParams: WF.WorkflowParameters, workflowData: DBAPI.WorkflowConstellation) {
        this.workflowParams = workflowParams;
        this.workflowData = workflowData;
        this.workflowParams; this.workflowData;
    }

    async start(): Promise<H.IOResults> {
        this.workflowReport = await REP.ReportFactory.getReport();

        const workflowStep: DBAPI.WorkflowStep | null = (!this.workflowData.workflowStep || this.workflowData.workflowStep.length <= 0)
            ? null : this.workflowData.workflowStep[this.workflowData.workflowStep.length - 1];
        if (workflowStep) {
            workflowStep.setState(DBAPI.eWorkflowJobRunStatus.eRunning);
            await workflowStep.update();
        }
        const validateRes: H.IOResults = await this.validateFiles();
        if (!validateRes.success)
            await this.updateStatus(DBAPI.eWorkflowJobRunStatus.eError);
        return validateRes;
    }

    async update(_workflowStep: DBAPI.WorkflowStep, _jobRun: DBAPI.JobRun): Promise<WF.WorkflowUpdateResults> {
        return { success: true, workflowComplete: true };
    }

    async updateStatus(eStatus: DBAPI.eWorkflowJobRunStatus): Promise<WF.WorkflowUpdateResults> {
        const workflowComplete: boolean = (eStatus === DBAPI.eWorkflowJobRunStatus.eDone
            || eStatus === DBAPI.eWorkflowJobRunStatus.eError
            || eStatus === DBAPI.eWorkflowJobRunStatus.eCancelled);

        const workflowStep: DBAPI.WorkflowStep | null = (!this.workflowData.workflowStep || this.workflowData.workflowStep.length <= 0)
            ? null : this.workflowData.workflowStep[this.workflowData.workflowStep.length - 1];

        if (!workflowStep)
            return { success: false, workflowComplete, error: 'Missing WorkflowStep' };
        workflowStep.setState(eStatus);
        const success: boolean = await workflowStep.update();
        return { success, workflowComplete, error: success ? '' : 'Database Error' };
    }

    async waitForCompletion(_timeout: number): Promise<H.IOResults> {
        return this.results;
    }

    async workflowConstellation(): Promise<DBAPI.WorkflowConstellation | null> {
        return this.workflowData;
    }

    private async validateFiles(): Promise<H.IOResults> {
        this.appendToWFReport('Upload validating files');

        const WFUVersion: WorkflowUtilExtractAssetVersions = await WorkflowUtil.extractAssetVersions(this.workflowParams.idSystemObject);
        if (!WFUVersion.success) {
            this.results = { success: false, error: WFUVersion.error };
            return this.results;
        }

        if (!WFUVersion.systemObjectAssetVersionMap)
            return this.results;

        for (const [ idSystemObject, idAssetVersion ] of WFUVersion.systemObjectAssetVersionMap) {
            const assetVersion: DBAPI.AssetVersion | null = await DBAPI.AssetVersion.fetch(idAssetVersion);
            if (!assetVersion)
                return this.handleError(`WorkflowUpload.validateFiles unable to fetch asset version ${idAssetVersion}`);
            const asset: DBAPI.Asset | null = await DBAPI.Asset.fetch(assetVersion.idAsset);
            if (!asset)
                return this.handleError(`WorkflowUpload.validateFiles unable to load asset for ${assetVersion.idAsset}`);

            const isModel: boolean = await this.testIfModel(assetVersion.FileName, asset);

            const RSR: STORE.ReadStreamResult = await STORE.AssetStorageAdapter.readAssetVersionByID(idAssetVersion);
            if (!RSR.success || !RSR.readStream || !RSR.fileName)
                return this.handleError(`WorkflowUpload.validateFiles unable to read asset version ${JSON.stringify(assetVersion, H.Helpers.saferStringify)}: ${RSR.error}`);
            this.appendToWFReport(`Upload validation of ${RSR.fileName}`);

            let fileRes: H.IOResults = { success: true };
            if (isModel) // if we're a model, zipped or not, validate the entire file/collection as is:
                fileRes = await this.validateFileModel(RSR.fileName, RSR.readStream, false, idSystemObject);
            else if (path.extname(RSR.fileName).toLowerCase() !== '.zip') // not a zip
                fileRes = await this.validateFile(RSR.fileName, RSR.readStream, false, idSystemObject, asset);
            else {
                const ZS: ZipStream = new ZipStream(RSR.readStream);
                const zipRes: H.IOResults = await ZS.load();
                if (!zipRes.success)
                    return this.handleError(`WorkflowUpload.validateFiles unable to unzip asset version ${RSR.fileName}: ${zipRes.error}`);

                const files: string[] = await ZS.getJustFiles(null);
                for (const fileName of files) {
                    const readStream: NodeJS.ReadableStream | null = await ZS.streamContent(fileName);
                    if (!readStream)
                        return this.handleError(`WorkflowUpload.validateFiles unable to fetch read stream for ${fileName} in zip of asset version ${JSON.stringify(assetVersion, H.Helpers.saferStringify)}`);
                    await this.validateFile(fileName, readStream, true, idSystemObject, asset);
                }
            }

            if (fileRes.success) {
                if (assetVersion.Ingested === null) {
                    assetVersion.Ingested = false;
                    if (!await assetVersion.update())
                        this.handleError(`WorkflowUpload.validateFile ${RSR.fileName} post-upload workflow succeeded, but unable to update asset version ingested flag`);
                }
            } else { // fileRes.success === false
                const ASR: STORE.AssetStorageResult = await STORE.AssetStorageAdapter.discardAssetVersion(assetVersion);
                if (!ASR.success)
                    this.handleError(`WorkflowUpload.validateFile ${RSR.fileName} failed to discard failed upload: ${ASR.error}`);
            }
        }

        return this.results;
    }

    private async validateFile(fileName: string, readStream: NodeJS.ReadableStream, fromZip: boolean, idSystemObject: number,
        asset: DBAPI.Asset): Promise<H.IOResults> {

        // validate scene file by loading it:
        if (fileName.toLowerCase().endsWith('.svx.json'))
            return this.validateFileScene(fileName, readStream);
        else if (await this.testIfModel(fileName, asset))
            return this.validateFileModel(fileName, readStream, fromZip, idSystemObject);
        else {
            // validate formats handled by Sharp
            switch (path.extname(fileName).toLowerCase()) {
                case '.avif':
                case '.gif':
                case '.jpg':
                case '.jpeg':
                case '.png':
                case '.svg':
                case '.tif':
                case '.tiff':
                case '.webp':
                    return this.validateFileImage(fileName, readStream);

                default: break;
            }
        }

        this.appendToWFReport(`Upload validation skipped for ${fileName}`);
        return { success: true };
    }

    private async validateFileScene(fileName: string, readStream: NodeJS.ReadableStream): Promise<H.IOResults> {
        const svxReader: SvxReader = new SvxReader();
        const svxRes: H.IOResults = await svxReader.loadFromStream(readStream);
        // LOG.info(`WorkflowUpload.validateFile validating SVX: ${svxRes.success}`, LOG.LS.eWF);
        return (svxRes.success)
            ? this.appendToWFReport(`Upload validated ${fileName}`)
            : this.handleError(`WorkflowUpload.validateFile failed to parse svx file ${fileName}: ${svxRes.error}`);
    }

    private async validateFileImage(fileName: string, readStream: NodeJS.ReadableStream): Promise<H.IOResults> {
        const buffer: Buffer | null = await H.Helpers.readFileFromStream(readStream);
        if (!buffer)
            return this.handleError(`WorkflowUpload.validateFile unable to read stream for ${fileName}`);
        try {
            const SH: sharp.Sharp = sharp(buffer);
            const stats: sharp.Stats = await SH.stats();
            // LOG.info(`WorkflowUpload.validateFile validating image with extension ${extension}, with ${stats.channels.length} channels`, LOG.LS.eWF);
            return (stats.channels.length >= 1)
                ? this.appendToWFReport(`Upload validated ${fileName}`)
                : this.handleError(`WorkflowUpload.validateFile encountered invalid image ${fileName}`);
        } catch (error) {
            const message: string = `WorkflowUpload.validateFile encountered exception processing ${fileName}${(error instanceof Error) ? ': ' + error.message : ''}`;
            return (path.extname(fileName).toLowerCase() !== '.svg') ? this.handleError(message) : this.appendToWFReport(message);
        }
    }

    private async validateFileModel(fileName: string, readStream: NodeJS.ReadableStream, fromZip: boolean, idSystemObject: number): Promise<H.IOResults> {
        switch (path.extname(fileName).toLowerCase()) {
            case '.usda':
            case '.usdc':
            case '.usdz':
            case '.wrl':
                this.appendToWFReport(`Upload validation skipped for model ${fileName} (not yet supported by Cook's si-packrat-inspect recipe)`);
                return { success: true };
        }

        // initiate WorkflowJob for cook si-packrat-inspect
        const parameters: WorkflowJobParameters =
            new WorkflowJobParameters(CACHE.eVocabularyID.eJobJobTypeCookSIPackratInspect,
                new COOK.JobCookSIPackratInspectParameters(fileName /* assetVersion.FileName */, undefined, !fromZip ? undefined : readStream));

        const wfParams: WF.WorkflowParameters = {
            eWorkflowType: CACHE.eVocabularyID.eWorkflowTypeCookJob,
            idSystemObject: [idSystemObject],
            idProject: this.workflowParams.idProject,
            idUserInitiator: this.workflowParams.idUserInitiator,
            parameters,
        };

        const workflowEngine: WF.IWorkflowEngine | null = await WF.WorkflowFactory.getInstance();
        if (!workflowEngine)
            return this.handleError(`WorkflowUpload.validateFile ${fileName} unable to create Cook si-packrat-inspect workflow: ${JSON.stringify(wfParams)}`);

        const workflow = await workflowEngine.create(wfParams);
        if (!workflow)
            return this.handleError(`WorkflowUpload.validateFile ${fileName} unable to create Cook si-packrat-inspect workflow: ${JSON.stringify(wfParams)}`);

        const results = await workflow.waitForCompletion(3600000);
        if (results.success) {
            this.appendToWFReport(`Upload validated ${fileName}`);
            return results;
        } else {
            return this.handleError(`WorkflowUpload.validateFile ${fileName} post-upload workflow error: ${results.error}`);
        }
    }

    private async testIfModel(fileName: string, asset: DBAPI.Asset): Promise<boolean> {
        if (await CACHE.VocabularyCache.mapModelFileByExtension(fileName) !== undefined)
            return true;
        // might be zipped; check asset
        const eAssetType: CACHE.eVocabularyID | undefined = await asset.assetType();
        switch (eAssetType) {
            case CACHE.eVocabularyID.eAssetAssetTypeModel:
            case CACHE.eVocabularyID.eAssetAssetTypeModelGeometryFile:
                return true;
        }
        return false;
    }

    private async appendToWFReport(message: string, isError?: boolean | undefined): Promise<H.IOResults> {
        if (isError)
            LOG.error(message, LOG.LS.eWF);
        else
            LOG.info(message, LOG.LS.eWF);
        return (this.workflowReport) ? this.workflowReport.append(message) : { success: true };
    }

    private async handleError(error: string): Promise<H.IOResults> {
        this.appendToWFReport(error, true);

        this.results = { success: false, error: (this.results.error ? this.results.error + '/n' : '') + error };
        return this.results;
    }
}