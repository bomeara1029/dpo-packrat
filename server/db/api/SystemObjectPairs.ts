/* eslint-disable camelcase */
import * as P from '@prisma/client';
import { Actor, Asset, AssetVersion, CaptureData, IntermediaryFile, Item, Model,
    Project, ProjectDocumentation, Scene, Stakeholder, SystemObject, SystemObjectBased, Subject, Unit } from '..';
import * as DBC from '../connection';
import * as LOG from '../../utils/logger';

type SystemObjectPairsBase = P.SystemObject
& { Actor: P.Actor | null}
& { Asset_AssetToSystemObject_idAsset: P.Asset | null}
& { AssetVersion_AssetVersionToSystemObject_idAssetVersion: P.AssetVersion | null}
& { CaptureData: P.CaptureData | null}
& { IntermediaryFile: P.IntermediaryFile | null}
& { Item: P.Item | null}
& { Model: P.Model | null}
& { Project: P.Project | null}
& { ProjectDocumentation: P.ProjectDocumentation | null}
& { Scene: P.Scene | null}
& { Stakeholder: P.Stakeholder | null}
& { Subject: P.Subject | null}
& { Unit: P.Unit | null};

type SystemObjectActorBase = P.SystemObject & { Actor: P.Actor | null};
type SystemObjectAssetBase = P.SystemObject & { Asset_AssetToSystemObject_idAsset: P.Asset | null};
type SystemObjectAssetVersionBase = P.SystemObject & { AssetVersion_AssetVersionToSystemObject_idAssetVersion: P.AssetVersion | null};
type SystemObjectCaptureDataBase = P.SystemObject & { CaptureData: P.CaptureData | null};
type SystemObjectIntermediaryFileBase = P.SystemObject & { IntermediaryFile: P.IntermediaryFile | null};
type SystemObjectItemBase = P.SystemObject & { Item: P.Item | null};
type SystemObjectModelBase = P.SystemObject & { Model: P.Model | null};
type SystemObjectProjectBase = P.SystemObject & { Project: P.Project | null};
type SystemObjectProjectDocumentationBase = P.SystemObject & { ProjectDocumentation: P.ProjectDocumentation | null};
type SystemObjectSceneBase = P.SystemObject & { Scene: P.Scene | null};
type SystemObjectStakeholderBase = P.SystemObject & { Stakeholder: P.Stakeholder | null};
type SystemObjectSubjectBase = P.SystemObject & { Subject: P.Subject | null};
type SystemObjectUnitBase = P.SystemObject & { Unit: P.Unit | null};

export class SystemObjectActor extends SystemObject implements SystemObjectActorBase {
    Actor: Actor | null;

    constructor(input: SystemObjectActorBase) {
        super(input);
        this.Actor = (input.Actor) ? new Actor(input.Actor) : /* istanbul ignore next */ null;
    }

    static async fetch(idActor: number): Promise<SystemObjectActor | null> {
        if (!idActor)
            return null;
        try {
            const SOPair: SystemObjectActorBase | null =
                await DBC.DBConnection.prisma.systemObject.findUnique({ where: { idActor, }, include: { Actor: true, }, });
            return SOPair ? new SystemObjectActor(SOPair) : null;
        } catch (error) /* istanbul ignore next */ {
            LOG.error('DBAPI.SystemObjectActor.fetch', LOG.LS.eDB, error);
            return null;
        }
    }
}

export class SystemObjectAsset extends SystemObject implements SystemObjectAssetBase {
    Asset_AssetToSystemObject_idAsset: Asset | null; // wacky name produced by prisma
    get Asset(): Asset | null {
        return this.Asset_AssetToSystemObject_idAsset;
    }
    set Asset(value: Asset | null) {
        this.Asset_AssetToSystemObject_idAsset = value;
    }

    constructor(input: SystemObjectAssetBase) {
        super(input);
        this.Asset_AssetToSystemObject_idAsset = (input.Asset_AssetToSystemObject_idAsset)
            ? new Asset(input.Asset_AssetToSystemObject_idAsset) : /* istanbul ignore next */ null;
    }

    static async fetch(idAsset: number): Promise<SystemObjectAsset | null> {
        if (!idAsset)
            return null;
        try {
            const SOPair: SystemObjectAssetBase | null =
                await DBC.DBConnection.prisma.systemObject.findUnique({ where: { idAsset, }, include: { Asset_AssetToSystemObject_idAsset: true, }, });
            return SOPair ? new SystemObjectAsset(SOPair) : null;
        } catch (error) /* istanbul ignore next */ {
            LOG.error('DBAPI.SystemObjectAsset.fetch', LOG.LS.eDB, error);
            return null;
        }
    }
}

export class SystemObjectAssetVersion extends SystemObject implements SystemObjectAssetVersionBase {
    AssetVersion_AssetVersionToSystemObject_idAssetVersion: AssetVersion | null;

    constructor(input: SystemObjectAssetVersionBase) {
        super(input);
        this.AssetVersion_AssetVersionToSystemObject_idAssetVersion = (input.AssetVersion_AssetVersionToSystemObject_idAssetVersion) ? new AssetVersion(input.AssetVersion_AssetVersionToSystemObject_idAssetVersion) : /* istanbul ignore next */ null;
    }

    static async fetch(idAssetVersion: number): Promise<SystemObjectAssetVersion | null> {
        if (!idAssetVersion)
            return null;
        try {
            const SOPair: SystemObjectAssetVersionBase | null =
                await DBC.DBConnection.prisma.systemObject.findUnique({ where: { idAssetVersion, }, include: { AssetVersion_AssetVersionToSystemObject_idAssetVersion: true, }, });
            return SOPair ? new SystemObjectAssetVersion(SOPair) : null;
        } catch (error) /* istanbul ignore next */ {
            LOG.error('DBAPI.SystemObjectAssetVersion.fetch', LOG.LS.eDB, error);
            return null;
        }
    }
}

export class SystemObjectCaptureData extends SystemObject implements SystemObjectCaptureDataBase {
    CaptureData: CaptureData | null;

    constructor(input: SystemObjectCaptureDataBase) {
        super(input);
        this.CaptureData = (input.CaptureData) ? new CaptureData(input.CaptureData) : /* istanbul ignore next */ null;
    }

    static async fetch(idCaptureData: number): Promise<SystemObjectCaptureData | null> {
        if (!idCaptureData)
            return null;
        try {
            const SOPair: SystemObjectCaptureDataBase | null =
                await DBC.DBConnection.prisma.systemObject.findUnique({ where: { idCaptureData, }, include: { CaptureData: true, }, });
            return SOPair ? new SystemObjectCaptureData(SOPair) : null;
        } catch (error) /* istanbul ignore next */ {
            LOG.error('DBAPI.SystemObjectCaptureData.fetch', LOG.LS.eDB, error);
            return null;
        }
    }
}

export class SystemObjectIntermediaryFile extends SystemObject implements SystemObjectIntermediaryFileBase {
    IntermediaryFile: IntermediaryFile | null;

    constructor(input: SystemObjectIntermediaryFileBase) {
        super(input);
        this.IntermediaryFile = (input.IntermediaryFile) ? new IntermediaryFile(input.IntermediaryFile) : /* istanbul ignore next */ null;
    }

    static async fetch(idIntermediaryFile: number): Promise<SystemObjectIntermediaryFile | null> {
        if (!idIntermediaryFile)
            return null;
        try {
            const SOPair: SystemObjectIntermediaryFileBase | null =
                await DBC.DBConnection.prisma.systemObject.findUnique({ where: { idIntermediaryFile, }, include: { IntermediaryFile: true, }, });
            return SOPair ? new SystemObjectIntermediaryFile(SOPair) : null;
        } catch (error) /* istanbul ignore next */ {
            LOG.error('DBAPI.SystemObjectIntermediaryFile.fetch', LOG.LS.eDB, error);
            return null;
        }
    }
}

export class SystemObjectItem extends SystemObject implements SystemObjectItemBase {
    Item: Item | null;

    constructor(input: SystemObjectItemBase) {
        super(input);
        this.Item = (input.Item) ? new Item(input.Item) : /* istanbul ignore next */ null;
    }

    static async fetch(idItem: number): Promise<SystemObjectItem | null> {
        if (!idItem)
            return null;
        try {
            const SOPair: SystemObjectItemBase | null =
                await DBC.DBConnection.prisma.systemObject.findUnique({ where: { idItem, }, include: { Item: true, }, });
            return SOPair ? new SystemObjectItem(SOPair) : null;
        } catch (error) /* istanbul ignore next */ {
            LOG.error('DBAPI.SystemObjectItem.fetch', LOG.LS.eDB, error);
            return null;
        }
    }
}

export class SystemObjectModel extends SystemObject implements SystemObjectModelBase {
    Model: Model | null;

    constructor(input: SystemObjectModelBase) {
        super(input);
        this.Model = (input.Model) ? new Model(input.Model) : /* istanbul ignore next */ null;
    }

    static async fetch(idModel: number): Promise<SystemObjectModel | null> {
        if (!idModel)
            return null;
        try {
            const SOPair: SystemObjectModelBase | null =
                await DBC.DBConnection.prisma.systemObject.findUnique({ where: { idModel, }, include: { Model: true, }, });
            return SOPair ? new SystemObjectModel(SOPair) : null;
        } catch (error) /* istanbul ignore next */ {
            LOG.error('DBAPI.SystemObjectModel.fetch', LOG.LS.eDB, error);
            return null;
        }
    }
}

export class SystemObjectProject extends SystemObject implements SystemObjectProjectBase {
    Project: Project | null;

    constructor(input: SystemObjectProjectBase) {
        super(input);
        this.Project = (input.Project) ? new Project(input.Project) : /* istanbul ignore next */ null;
    }

    static async fetch(idProject: number): Promise<SystemObjectProject | null> {
        if (!idProject)
            return null;
        try {
            const SOPair: SystemObjectProjectBase | null =
                await DBC.DBConnection.prisma.systemObject.findUnique({ where: { idProject, }, include: { Project: true, }, });
            return SOPair ? new SystemObjectProject(SOPair) : null;
        } catch (error) /* istanbul ignore next */ {
            LOG.error('DBAPI.SystemObjectProject.fetch', LOG.LS.eDB, error);
            return null;
        }
    }
}

export class SystemObjectProjectDocumentation extends SystemObject implements SystemObjectProjectDocumentationBase {
    ProjectDocumentation: ProjectDocumentation | null;

    constructor(input: SystemObjectProjectDocumentationBase) {
        super(input);
        this.ProjectDocumentation = (input.ProjectDocumentation) ? new ProjectDocumentation(input.ProjectDocumentation) : /* istanbul ignore next */ null;
    }

    static async fetch(idProjectDocumentation: number): Promise<SystemObjectProjectDocumentation | null> {
        if (!idProjectDocumentation)
            return null;
        try {
            const SOPair: SystemObjectProjectDocumentationBase | null =
                await DBC.DBConnection.prisma.systemObject.findUnique({ where: { idProjectDocumentation, }, include: { ProjectDocumentation: true, }, });
            return SOPair ? new SystemObjectProjectDocumentation(SOPair) : null;
        } catch (error) /* istanbul ignore next */ {
            LOG.error('DBAPI.SystemObjectProjectDocumentation.fetch', LOG.LS.eDB, error);
            return null;
        }
    }
}

export class SystemObjectScene extends SystemObject implements SystemObjectSceneBase {
    Scene: Scene | null;

    constructor(input: SystemObjectSceneBase) {
        super(input);
        this.Scene = (input.Scene) ? new Scene(input.Scene) : /* istanbul ignore next */ null;
    }

    static async fetch(idScene: number): Promise<SystemObjectScene | null> {
        if (!idScene)
            return null;
        try {
            const SOPair: SystemObjectSceneBase | null =
                await DBC.DBConnection.prisma.systemObject.findUnique({ where: { idScene, }, include: { Scene: true, }, });
            return SOPair ? new SystemObjectScene(SOPair) : null;
        } catch (error) /* istanbul ignore next */ {
            LOG.error('DBAPI.SystemObjectScene.fetch', LOG.LS.eDB, error);
            return null;
        }
    }
}

export class SystemObjectStakeholder extends SystemObject implements SystemObjectStakeholderBase {
    Stakeholder: Stakeholder | null;

    constructor(input: SystemObjectStakeholderBase) {
        super(input);
        this.Stakeholder = (input.Stakeholder) ? new Stakeholder(input.Stakeholder) : /* istanbul ignore next */ null;
    }

    static async fetch(idStakeholder: number): Promise<SystemObjectStakeholder | null> {
        if (!idStakeholder)
            return null;
        try {
            const SOPair: SystemObjectStakeholderBase | null =
                await DBC.DBConnection.prisma.systemObject.findUnique({ where: { idStakeholder, }, include: { Stakeholder: true, }, });
            return SOPair ? new SystemObjectStakeholder(SOPair) : null;
        } catch (error) /* istanbul ignore next */ {
            LOG.error('DBAPI.SystemObjectStakeholder.fetch', LOG.LS.eDB, error);
            return null;
        }
    }
}

export class SystemObjectSubject extends SystemObject implements SystemObjectSubjectBase {
    Subject: Subject | null;

    constructor(input: SystemObjectSubjectBase) {
        super(input);
        this.Subject = (input.Subject) ? new Subject(input.Subject) : /* istanbul ignore next */ null;
    }

    static async fetch(idSubject: number): Promise<SystemObjectSubject | null> {
        if (!idSubject)
            return null;
        try {
            const SOPair: SystemObjectSubjectBase | null =
                await DBC.DBConnection.prisma.systemObject.findUnique({ where: { idSubject, }, include: { Subject: true, }, });
            return SOPair ? new SystemObjectSubject(SOPair) : null;
        } catch (error) /* istanbul ignore next */ {
            LOG.error('DBAPI.SystemObjectSubject.fetch', LOG.LS.eDB, error);
            return null;
        }
    }
}

export class SystemObjectUnit extends SystemObject implements SystemObjectUnitBase {
    Unit: Unit | null;

    constructor(input: SystemObjectUnitBase) {
        super(input);
        this.Unit = (input.Unit) ? new Unit(input.Unit) : /* istanbul ignore next */ null;
    }

    static async fetch(idUnit: number): Promise<SystemObjectUnit | null> {
        if (!idUnit)
            return null;
        try {
            const SOPair: SystemObjectUnitBase | null =
                await DBC.DBConnection.prisma.systemObject.findUnique({ where: { idUnit, }, include: { Unit: true, }, });
            return SOPair ? new SystemObjectUnit(SOPair) : null;
        } catch (error) /* istanbul ignore next */ {
            LOG.error('DBAPI.SystemObjectUnit.fetch', LOG.LS.eDB, error);
            return null;
        }
    }
}

export class SystemObjectPairs extends SystemObject implements SystemObjectPairsBase {
    Actor: Actor | null = null;
    Asset_AssetToSystemObject_idAsset: Asset | null = null;
    AssetVersion_AssetVersionToSystemObject_idAssetVersion: AssetVersion | null = null;
    CaptureData: CaptureData | null = null;
    IntermediaryFile: IntermediaryFile | null = null;
    Item: Item | null = null;
    Model: Model | null = null;
    Project: Project | null = null;
    ProjectDocumentation: ProjectDocumentation | null = null;
    Scene: Scene | null = null;
    Stakeholder: Stakeholder | null = null;
    Subject: Subject | null = null;
    Unit: Unit | null = null;

    get Asset(): Asset | null {
        return this.Asset_AssetToSystemObject_idAsset;
    }
    set Asset(value: Asset | null) {
        this.Asset_AssetToSystemObject_idAsset = value;
    }

    get AssetVersion(): AssetVersion | null {
        return this.AssetVersion_AssetVersionToSystemObject_idAssetVersion;
    }
    set AssetVersion(value: AssetVersion | null) {
        this.AssetVersion_AssetVersionToSystemObject_idAssetVersion = value;
    }

    get SystemObjectBased(): SystemObjectBased | null {
        if (this.Actor) return this.Actor;
        if (this.Asset) return this.Asset;
        if (this.AssetVersion) return this.AssetVersion;
        if (this.CaptureData) return this.CaptureData;
        if (this.IntermediaryFile) return this.IntermediaryFile;
        if (this.Item) return this.Item;
        if (this.Model) return this.Model;
        if (this.Project) return this.Project;
        if (this.ProjectDocumentation) return this.ProjectDocumentation;
        if (this.Scene) return this.Scene;
        if (this.Stakeholder) return this.Stakeholder;
        if (this.Subject) return this.Subject;
        if (this.Unit) return this.Unit;
        return null;
    }

    constructor(input: SystemObjectPairsBase) {
        super(input);
        if (input.Actor) this.Actor = new Actor(input.Actor);
        if (input.Asset_AssetToSystemObject_idAsset) this.Asset_AssetToSystemObject_idAsset = new Asset(input.Asset_AssetToSystemObject_idAsset);
        if (input.AssetVersion_AssetVersionToSystemObject_idAssetVersion) this.AssetVersion_AssetVersionToSystemObject_idAssetVersion = new AssetVersion(input.AssetVersion_AssetVersionToSystemObject_idAssetVersion);
        if (input.CaptureData) this.CaptureData = new CaptureData(input.CaptureData);
        if (input.IntermediaryFile) this.IntermediaryFile = new IntermediaryFile(input.IntermediaryFile);
        if (input.Item) this.Item = new Item(input.Item);
        if (input.Model) this.Model = new Model(input.Model);
        if (input.Project) this.Project = new Project(input.Project);
        if (input.ProjectDocumentation) this.ProjectDocumentation = new ProjectDocumentation(input.ProjectDocumentation);
        if (input.Scene) this.Scene = new Scene(input.Scene);
        if (input.Subject) this.Subject = new Subject(input.Subject);
        if (input.Stakeholder) this.Stakeholder = new Stakeholder(input.Stakeholder);
        if (input.Unit) this.Unit = new Unit(input.Unit);
    }

    static async fetch(idSystemObject: number): Promise<SystemObjectPairs | null> {
        if (!idSystemObject)
            return null;
        try {
            const SOAPB: SystemObjectPairsBase | null =
                await DBC.DBConnection.prisma.systemObject.findUnique({
                    where: { idSystemObject, },
                    include: {
                        Actor: true,
                        Asset_AssetToSystemObject_idAsset: true,
                        AssetVersion_AssetVersionToSystemObject_idAssetVersion: true,
                        CaptureData: true,
                        IntermediaryFile: true,
                        Item: true,
                        Model: true,
                        Project: true,
                        ProjectDocumentation: true,
                        Scene: true,
                        Stakeholder: true,
                        Subject: true,
                        Unit: true
                    },
                });
            return (SOAPB ? new SystemObjectPairs(SOAPB) : null);
        } catch (error) /* istanbul ignore next */ {
            LOG.error(`DBAPI.SystemObjectAndPairs.fetch(${idSystemObject})`, LOG.LS.eDB, error);
            return null;
        }
    }

    static async fetchDerivedFromXref(idSystemObjectMaster: number): Promise<SystemObjectPairs[] | null> {
        if (!idSystemObjectMaster)
            return null;
        try {
            return DBC.CopyArray<SystemObjectPairsBase, SystemObjectPairs>(
                await DBC.DBConnection.prisma.systemObject.findMany({
                    where: {
                        SystemObjectXref_SystemObjectToSystemObjectXref_idSystemObjectDerived: {
                            some: { idSystemObjectMaster },
                        },
                    },
                    include: {
                        Actor: true,
                        Asset_AssetToSystemObject_idAsset: true,
                        AssetVersion_AssetVersionToSystemObject_idAssetVersion: true,
                        CaptureData: true,
                        IntermediaryFile: true,
                        Item: true,
                        Model: true,
                        Project: true,
                        ProjectDocumentation: true,
                        Scene: true,
                        Stakeholder: true,
                        Subject: true,
                        Unit: true
                    },
                }), SystemObjectPairs);
        } catch (error) /* istanbul ignore next */ {
            LOG.error('DBAPI.SystemObjectAndPairs.fetchDerivedFromXref', LOG.LS.eDB, error);
            return null;
        }
    }

    static async fetchMasterFromXref(idSystemObjectDerived: number): Promise<SystemObjectPairs[] | null> {
        if (!idSystemObjectDerived)
            return null;
        try {
            return DBC.CopyArray<SystemObjectPairsBase, SystemObjectPairs>(
                await DBC.DBConnection.prisma.systemObject.findMany({
                    where: {
                        SystemObjectXref_SystemObjectToSystemObjectXref_idSystemObjectMaster: {
                            some: { idSystemObjectDerived },
                        },
                    },
                    include: {
                        Actor: true,
                        Asset_AssetToSystemObject_idAsset: true,
                        AssetVersion_AssetVersionToSystemObject_idAssetVersion: true,
                        CaptureData: true,
                        IntermediaryFile: true,
                        Item: true,
                        Model: true,
                        Project: true,
                        ProjectDocumentation: true,
                        Scene: true,
                        Stakeholder: true,
                        Subject: true,
                        Unit: true
                    },
                }), SystemObjectPairs);
        } catch (error) /* istanbul ignore next */ {
            LOG.error('DBAPI.SystemObjectAndPairs.fetchMasterFromXref', LOG.LS.eDB, error);
            return null;
        }
    }
}
