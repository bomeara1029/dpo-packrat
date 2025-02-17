import * as DBAPI from '../../../../../db';
import * as COMMON from '@dpo-packrat/common';
import {
    AssetVersionDetailFields,
    AssetDetailFields,
    SubjectDetailFields,
    ItemDetailFields,
    GetDetailsTabDataForObjectResult,
    QueryGetDetailsTabDataForObjectArgs,
    CaptureDataDetailFields,
    SceneDetailFields
} from '../../../../../types/graphql';
import { Parent } from '../../../../../types/resolvers';
import * as LOG from '../../../../../utils/logger';
import * as H from '../../../../../utils/helpers';
import * as SH from '../../../../../utils/sceneHelpers';

export default async function getDetailsTabDataForObject(_: Parent, args: QueryGetDetailsTabDataForObjectArgs): Promise<GetDetailsTabDataForObjectResult> {
    const { input } = args;
    const { idSystemObject, objectType } = input;

    const result: GetDetailsTabDataForObjectResult = {
        Unit: null,
        Project: null,
        Subject: null,
        Item: null,
        CaptureData: null,
        Model: null,
        Scene: null,
        IntermediaryFile: null,
        ProjectDocumentation: null,
        Asset: null,
        AssetVersion: null,
        Actor: null,
        Stakeholder: null
    };

    const systemObject: DBAPI.SystemObject | null = await DBAPI.SystemObject.fetch(idSystemObject);

    switch (objectType) {
        case COMMON.eSystemObjectType.eUnit:
            if (systemObject?.idUnit) result.Unit = await DBAPI.Unit.fetch(systemObject.idUnit);
            break;
        case COMMON.eSystemObjectType.eProject:
            if (systemObject?.idProject) result.Project = await DBAPI.Project.fetch(systemObject.idProject);
            break;
        case COMMON.eSystemObjectType.eSubject: {
            if (systemObject?.idSubject) {
                let fields: SubjectDetailFields = {};

                const Subject = await DBAPI.Subject.fetch(systemObject.idSubject);

                fields = { ...Subject };
                if (Subject?.idGeoLocation) {
                    const GeoLocation = await DBAPI.GeoLocation.fetch(Subject.idGeoLocation);
                    fields = { ...fields, ...GeoLocation };
                }

                result.Subject = fields;
            }
            break;
        }
        case COMMON.eSystemObjectType.eItem: {
            if (systemObject?.idItem) {
                let fields: ItemDetailFields = {};

                const Item = await DBAPI.Item.fetch(systemObject.idItem);
                fields = { ...Item };

                if (Item?.idGeoLocation) {
                    const GeoLocation = await DBAPI.GeoLocation.fetch(Item.idGeoLocation);
                    fields = { ...fields, ...GeoLocation };
                }

                result.Item = fields;
            }
            break;
        }
        case COMMON.eSystemObjectType.eCaptureData:
            if (systemObject?.idCaptureData) {
                result.CaptureData = await getCaptureDataDetailFields(systemObject.idCaptureData);
            }
            break;
        case COMMON.eSystemObjectType.eModel:
            if (systemObject?.idModel) {
                result.Model = await DBAPI.ModelConstellation.fetch(systemObject.idModel);
            }
            break;
        case COMMON.eSystemObjectType.eScene:
            if (systemObject?.idScene) {
                let fields: SceneDetailFields = {
                    Links: []
                };
                const Scene: DBAPI.Scene | null = await DBAPI.Scene.fetch(systemObject.idScene);
                if (!Scene)
                    LOG.error(`getDetailsTabForObject(${systemObject.idSystemObject}) unable to compute Scene details`, LOG.LS.eGQL);
                const User: DBAPI.User | null = await DBAPI.Audit.fetchLastUser(systemObject.idSystemObject, DBAPI.eAuditType.eSceneQCd);
                const sceneCanBeQCdRes: H.IOResults = await SH.SceneHelpers.sceneCanBeQCd(systemObject.idScene);
                if (!sceneCanBeQCdRes.success && sceneCanBeQCdRes.error)
                    LOG.error(`getDetailsTabForObject(${systemObject.idSystemObject}) encountered error during SceneHelpers.sceneCanBeQCd: ${sceneCanBeQCdRes.error}`, LOG.LS.eGQL);

                fields = {
                    ...fields,
                    CountScene: Scene?.CountScene,
                    CountNode: Scene?.CountNode,
                    CountCamera: Scene?.CountCamera,
                    CountLight: Scene?.CountLight,
                    CountModel: Scene?.CountModel,
                    CountMeta: Scene?.CountMeta,
                    CountSetup: Scene?.CountSetup,
                    CountTour: Scene?.CountTour,
                    EdanUUID: Scene?.EdanUUID,
                    ApprovedForPublication: Scene?.ApprovedForPublication,
                    PublicationApprover: User?.Name ?? null,
                    PosedAndQCd: Scene?.PosedAndQCd,
                    CanBeQCd: sceneCanBeQCdRes.success,
                    idScene: systemObject.idScene,
                };
                result.Scene = fields;
            }
            break;
        case COMMON.eSystemObjectType.eIntermediaryFile:
            if (systemObject?.idIntermediaryFile) result.IntermediaryFile = await DBAPI.IntermediaryFile.fetch(systemObject.idIntermediaryFile);
            break;
        case COMMON.eSystemObjectType.eProjectDocumentation:
            if (systemObject?.idProjectDocumentation) result.ProjectDocumentation = await DBAPI.ProjectDocumentation.fetch(systemObject.idProjectDocumentation);
            break;
        case COMMON.eSystemObjectType.eAsset: {
            if (systemObject?.idAsset) {
                let fields: AssetDetailFields = {};

                const Asset = await DBAPI.Asset.fetch(systemObject.idAsset);
                fields = { ...Asset };

                if (Asset?.idVAssetType) {
                    const Vocabulary = await DBAPI.Vocabulary.fetch(Asset.idVAssetType);
                    fields = { ...fields, AssetType: Vocabulary?.idVocabulary };
                }
                result.Asset = fields;
            }
            break;
        }
        case COMMON.eSystemObjectType.eAssetVersion: {
            if (systemObject?.idAssetVersion) {
                let fields: AssetVersionDetailFields = {};

                const AssetVersion = await DBAPI.AssetVersion.fetch(systemObject.idAssetVersion);
                fields = { ...AssetVersion };

                if (AssetVersion?.idUserCreator) {
                    const User = await DBAPI.User.fetch(AssetVersion.idUserCreator);
                    fields = { ...fields, Creator: User?.Name };
                }
                result.AssetVersion = fields;
            }

            break;
        }
        case COMMON.eSystemObjectType.eActor:
            if (systemObject?.idActor) result.Actor = await DBAPI.Actor.fetch(systemObject.idActor);
            break;
        case COMMON.eSystemObjectType.eStakeholder:
            if (systemObject?.idStakeholder) result.Stakeholder = await DBAPI.Stakeholder.fetch(systemObject.idStakeholder);
            break;
        default:
            break;
    }

    return result;
}

async function getCaptureDataDetailFields(idCaptureData: number): Promise<CaptureDataDetailFields> {
    let fields: CaptureDataDetailFields = {
        folders: []
    };

    // creates a unique map of AssetVersion.filePath and file.idVVariantType
    const foldersMap: Map<string, number | null> | null = await DBAPI.CaptureDataFile.fetchFolderVariantMapFromCaptureData(idCaptureData);
    if (foldersMap) {
        foldersMap.forEach((value, key) => {
            fields.folders.push({ name: key, variantType: value });
        });
    }

    const CaptureData = await DBAPI.CaptureData.fetch(idCaptureData);
    fields = {
        ...fields,
        systemCreated: true,
        dateCaptured: CaptureData?.DateCaptured.toISOString(),
        description: CaptureData?.Description,
        captureMethod: CaptureData?.idVCaptureMethod
    };

    const CaptureDataPhoto = await DBAPI.CaptureDataPhoto.fetchFromCaptureData(idCaptureData);
    if (CaptureDataPhoto && CaptureDataPhoto[0]) {
        const [CD] = CaptureDataPhoto;

        fields = {
            ...fields,
            cameraSettingUniform: CD.CameraSettingsUniform,
            datasetType: CD.idVCaptureDatasetType,
            datasetFieldId: CD.CaptureDatasetFieldID,
            itemPositionType: CD.idVItemPositionType,
            itemPositionFieldId: CD.ItemPositionFieldID,
            itemArrangementFieldId: CD.ItemArrangementFieldID,
            focusType: CD.idVFocusType,
            lightsourceType: CD.idVLightSourceType,
            backgroundRemovalMethod: CD.idVBackgroundRemovalMethod,
            clusterType: CD.idVClusterType,
            clusterGeometryFieldId: CD.ClusterGeometryFieldID,
            isValidData: true
        };
    } else {
        fields = {
            ...fields,
            isValidData: false
        };
    }


    return fields;
}