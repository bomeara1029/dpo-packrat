/* eslint-disable camelcase */
import { SystemObjectXref as SystemObjectXrefBase } from '@prisma/client';
import { SystemObjectBased, SystemObject } from '..';
import * as DBC from '../connection';
import * as LOG from '../../utils/logger';
import * as H from '../../utils/helpers';

export class SystemObjectXref extends DBC.DBObject<SystemObjectXrefBase> implements SystemObjectXrefBase {
    idSystemObjectXref!: number;
    idSystemObjectMaster!: number;
    idSystemObjectDerived!: number;

    constructor(input: SystemObjectXrefBase) {
        super(input);
    }

    public fetchTableName(): string { return 'SystemObjectXref'; }
    public fetchID(): number { return this.idSystemObjectXref; }

    protected async createWorker(): Promise<boolean> {
        try {
            const { idSystemObjectMaster, idSystemObjectDerived } = this;
            ({ idSystemObjectXref: this.idSystemObjectXref, idSystemObjectMaster: this.idSystemObjectMaster,
                idSystemObjectDerived: this.idSystemObjectDerived } =
                await DBC.DBConnection.prisma.systemObjectXref.create({
                    data: {
                        SystemObject_SystemObjectToSystemObjectXref_idSystemObjectMaster:  { connect: { idSystemObject: idSystemObjectMaster }, },
                        SystemObject_SystemObjectToSystemObjectXref_idSystemObjectDerived: { connect: { idSystemObject: idSystemObjectDerived }, },
                    }
                }));
            return true;
        } catch (error) /* istanbul ignore next */ {
            return this.logError('create', error);
        }
    }

    protected async updateWorker(): Promise<boolean> {
        try {
            const { idSystemObjectXref, idSystemObjectMaster, idSystemObjectDerived } = this;
            return await DBC.DBConnection.prisma.systemObjectXref.update({
                where: { idSystemObjectXref, },
                data: {
                    SystemObject_SystemObjectToSystemObjectXref_idSystemObjectMaster:  { connect: { idSystemObject: idSystemObjectMaster }, },
                    SystemObject_SystemObjectToSystemObjectXref_idSystemObjectDerived: { connect: { idSystemObject: idSystemObjectDerived }, },
                }
            }) ? true : /* istanbul ignore next */ false;
        } catch (error) /* istanbul ignore next */ {
            return this.logError('update', error);
        }
    }
    /** Don't call this directly; instead, let DBObject.delete() call this. Code needing to delete a record should call this.delete(); */
    protected async deleteWorker(): Promise<boolean> {
        try {
            // LOG.info(`SystemObjectXref.deleteWorker ${JSON.stringify(this)}`, LOG.LS.eDB);
            const { idSystemObjectXref } = this;
            return await DBC.DBConnection.prisma.systemObjectXref.delete({
                where: { idSystemObjectXref, },
            }) ? true : /* istanbul ignore next */ false;
        } catch (error) /* istanbul ignore next */ {
            LOG.error('DBAPI.SystemObjectXref.delete', LOG.LS.eDB, error);
            return false;
        }
    }

    async deleteIfAllowed(): Promise<H.IOResults> {
        try {
            // Xref records can be removed as long as this is not the final subject "master" for an item "derived"
            // The query below counts how many xref records match this criteria for the this.idSystemObjectDerived
            const subjectItemLinkCount: { RowCount: BigInt }[] =
                await DBC.DBConnection.prisma.$queryRaw<{ RowCount: BigInt }[]>`
                SELECT COUNT(*) AS 'RowCount'
                FROM SystemObjectXref AS SOX
                JOIN SystemObject AS SOMaster ON (SOX.idSystemObjectMaster = SOMaster.idSystemObject)
                JOIN SystemObject AS SODerived ON (SOX.idSystemObjectDerived = SODerived.idSystemObject)
                WHERE SOMaster.idSubject IS NOT NULL
                  AND SODerived.idItem IS NOT NULL
                  AND SODerived.idSystemObject = ${this.idSystemObjectDerived};`;
            // LOG.info(`SystemObjectXref.deleteIfAllowed ${JSON.stringify(this)}: ${JSON.stringify(subjectItemLinkCount)} relationships`, LOG.LS.eDB);

            /* istanbul ignore next */
            if (subjectItemLinkCount.length != 1) // array of wrong length returned, error ... should never happen
                return { success: false, error: `Unable to remove final subject from Item ${this.idSystemObjectDerived}` };

            if (Number(subjectItemLinkCount[0].RowCount) === 1) {
                // determine if this.idSystemObjectMaster points to a subject (if so, it's the only one linked!)
                const SO: SystemObject | null = await SystemObject.fetch(this.idSystemObjectMaster);
                if (SO && SO.idSubject)
                    return { success: false, error: `Unable to remove final subject from Item ${this.idSystemObjectDerived}` };
            }
        } catch (error) /* istanbul ignore next */ {
            LOG.error('DBAPI.SystemObjectXref.deleteIfAllowed', LOG.LS.eDB, error);
            return { success: false, error: JSON.stringify(error) };
        }

        return (await this.delete())
            ? { success: true } /* istanbul ignore next */
            : { success: false, error: `Database error deleting xref ${JSON.stringify(this)}` };
    }

    static async deleteIfAllowed(idSystemObjectXref: number): Promise<H.IOResults> {
        const sox: SystemObjectXref | null = await SystemObjectXref.fetch(idSystemObjectXref);
        return (sox) ? sox.deleteIfAllowed()
            : { success: false, error: `Unable to load SystemObjectXref with id ${idSystemObjectXref}` };
    }

    static async fetch(idSystemObjectXref: number): Promise<SystemObjectXref | null> {
        if (!idSystemObjectXref)
            return null;
        try {
            return DBC.CopyObject<SystemObjectXrefBase, SystemObjectXref>(
                await DBC.DBConnection.prisma.systemObjectXref.findUnique({ where: { idSystemObjectXref, }, }), SystemObjectXref);
        } catch (error) /* istanbul ignore next */ {
            LOG.error('DBAPI.SystemObjectXref.fetch', LOG.LS.eDB, error);
            return null;
        }
    }

    static async fetchXref(idSystemObjectMaster: number, idSystemObjectDerived: number): Promise<SystemObjectXref[] | null> {
        if (!idSystemObjectMaster || !idSystemObjectDerived)
            return null;
        try {
            return DBC.CopyArray<SystemObjectXrefBase, SystemObjectXref>(
                await DBC.DBConnection.prisma.systemObjectXref.findMany({
                    where: { AND: [ { idSystemObjectMaster }, { idSystemObjectDerived }, ] }, }), SystemObjectXref);
        } catch (error) /* istanbul ignore next */ {
            LOG.error('DBAPI.SystemObjectXref.fetchXref', LOG.LS.eDB, error);
            return null;
        }
    }

    static async fetchMasters(idSystemObjectDerived: number): Promise<SystemObjectXref[] | null> {
        if (!idSystemObjectDerived)
            return null;
        try {
            return DBC.CopyArray<SystemObjectXrefBase, SystemObjectXref>(
                await DBC.DBConnection.prisma.systemObjectXref.findMany({
                    where: { idSystemObjectDerived }, }), SystemObjectXref);
        } catch (error) /* istanbul ignore next */ {
            LOG.error('DBAPI.SystemObjectXref.fetchMasters', LOG.LS.eDB, error);
            return null;
        }
    }

    static async fetchDerived(idSystemObjectMaster: number): Promise<SystemObjectXref[] | null> {
        if (!idSystemObjectMaster)
            return null;
        try {
            return DBC.CopyArray<SystemObjectXrefBase, SystemObjectXref>(
                await DBC.DBConnection.prisma.systemObjectXref.findMany({
                    where: { idSystemObjectMaster }, }), SystemObjectXref);
        } catch (error) /* istanbul ignore next */ {
            LOG.error('DBAPI.SystemObjectXref.fetchDerived', LOG.LS.eDB, error);
            return null;
        }
    }

    static async wireObjectsIfNeeded(master: SystemObjectBased, derived: SystemObjectBased): Promise<SystemObjectXref | null>;
    static async wireObjectsIfNeeded(master: SystemObjectBased, derivedID: number): Promise<SystemObjectXref | null>;
    static async wireObjectsIfNeeded(masterID: number, derived: SystemObjectBased): Promise<SystemObjectXref | null>;
    static async wireObjectsIfNeeded(masterID: number, derivedID: number): Promise<SystemObjectXref | null>;
    static async wireObjectsIfNeeded(master: SystemObjectBased | number, derived: SystemObjectBased | number): Promise<SystemObjectXref | null> {
        const masterID: number | null = (typeof(master) === 'number') ? master : null;
        const derivedID: number | null = (typeof(derived) === 'number') ? derived : null;
        const masterSOBased: SystemObjectBased | null = (typeof(master) !== 'number') ? master : null;
        const derivedSOBased: SystemObjectBased | null = (typeof(derived) !== 'number') ? derived : null;

        const SOMaster: SystemObject | null = masterSOBased ? await masterSOBased.fetchSystemObject() :
            await SystemObject.fetch(masterID!); /* istanbul ignore next */ // eslint-disable-line @typescript-eslint/no-non-null-assertion
        if (!SOMaster) {
            LOG.error(`DBAPI.SystemObjectXref.wireObjectsIfNeeded Unable to compute SystemObject for ${JSON.stringify(master)}`, LOG.LS.eDB);
            return null;
        }

        const SODerived: SystemObject | null = derivedSOBased ? await derivedSOBased.fetchSystemObject():
            await SystemObject.fetch(derivedID!) ; /* istanbul ignore next */ // eslint-disable-line @typescript-eslint/no-non-null-assertion
        if (!SODerived) {
            LOG.error(`DBAPI.SystemObjectXref.wireObjectsIfNeeded Unable to compute SystemObject for ${JSON.stringify(derived)}`, LOG.LS.eDB);
            return null;
        }

        const idSystemObjectMaster: number = SOMaster.idSystemObject;
        const idSystemObjectDerived: number = SODerived.idSystemObject;
        const xrefs: SystemObjectXref[] | null = await this.fetchXref(idSystemObjectMaster, idSystemObjectDerived);
        if (xrefs && xrefs.length > 0)
            return xrefs[0];

        const xref: SystemObjectXref | null = new SystemObjectXref({ idSystemObjectMaster, idSystemObjectDerived, idSystemObjectXref: 0 });
        return (await xref.create()) ? xref : /* istanbul ignore next */ null;
    }
}
