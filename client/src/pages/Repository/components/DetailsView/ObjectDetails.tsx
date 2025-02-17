/* eslint-disable react/jsx-max-props-per-line */
/**
 * Object Details
 *
 * This component renders object details for the Repository Details UI.
 */
import { Box, Checkbox, Typography, Select, MenuItem, Tooltip } from '@material-ui/core';
import { withStyles, makeStyles, createStyles } from '@material-ui/core/styles';
import React, { useEffect, useState } from 'react';
import { NewTabLink } from '../../../../components';
import { GetSystemObjectDetailsResult, RepositoryPath, License } from '../../../../types/graphql';
import { getDetailsUrlForObject, getUpdatedCheckboxProps, isFieldUpdated } from '../../../../utils/repository';
import { withDefaultValueBoolean } from '../../../../utils/shared';
import { useLicenseStore } from '../../../../store';
import { clearLicenseAssignment, assignLicense, publish } from '../../hooks/useDetailsView';
import { getTermForSystemObjectType } from '../../../../utils/repository';
import { LoadingButton } from '../../../../components';
import { toast } from 'react-toastify';
import { eSystemObjectType, ePublishedState } from '@dpo-packrat/common';
import { ToolTip } from '../../../../components';
import { HelpOutline } from '@material-ui/icons';

const useStyles = makeStyles(({ palette }) => createStyles({
    detail: {
        display: 'flex',
        alignItems: 'center',
        minHeight: 20,
        width: '100%',
        marginBottom: 8
    },
    label: {
        fontWeight: 500,
        alignSelf: 'center',
        color: palette.primary.dark
    },
    value: {
        color: palette.primary.dark,
        textDecoration: ({ clickable = true, value, paths }: DetailProps) => (clickable && (value || paths) ? 'underline' : undefined)
    }
}));

const useObjectDetailsStyles = makeStyles(({ breakpoints, palette }) => ({
    loadingBtn: {
        height: 20,
        width: 'fit-content',
        color: palette.background.paper,
        [breakpoints.down('lg')]: {
            height: 24
        }
    },
    select: {
        fontSize: '0.875rem',
        color: 'rgb(44, 64, 90)',
        marginRight: '5px',
        height: 20
    },
    assignedLicense: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        whiteSpace: 'pre',
        flexWrap: 'wrap'
    },
    inheritedLicense: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'baseline',
        whiteSpace: 'pre-wrap',
        flexWrap: 'wrap'
    },
    link: {
        display: 'flex',
        color: 'rgb(0, 121, 196)',
        marginRight: '5px',
        textDecoration: 'underline'
    },
    value: {
        color: palette.primary.dark
    }
}));

const CheckboxNoPadding = withStyles({
    root: {
        border: '0px',
        padding: '0px',
        height: 10,
        width: 10,
        paddingLeft: 3
    }
})(Checkbox);

interface ObjectDetailsProps {
    unit?: RepositoryPath[] | null;
    project?: RepositoryPath[] | null;
    subject?: RepositoryPath[] | null;
    item?: RepositoryPath[] | null;
    asset?: RepositoryPath | null;
    disabled: boolean;
    publishedState: string;
    publishedEnum: number;
    publishable: boolean;
    retired: boolean;
    hideRetired?: boolean;
    objectType?: number;
    originalFields?: GetSystemObjectDetailsResult;
    onRetiredUpdate?: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
    onLicenseUpdate?: (event) => void;
    path?: RepositoryPath[][] | null;
    updateData?: () => Promise<boolean>;
    idSystemObject: number;
    license?: number;
    licenseInheritance?: number | null;
}

function ObjectDetails(props: ObjectDetailsProps): React.ReactElement {
    const {
        unit,
        project,
        subject,
        item,
        asset,
        publishedState,
        publishedEnum,
        publishable,
        retired,
        hideRetired,
        objectType,
        disabled,
        originalFields,
        onRetiredUpdate,
        onLicenseUpdate,
        idSystemObject,
        license,
        licenseInheritance,
        path,
        updateData
    } = props;
    const [licenseList, setLicenseList] = useState<License[]>([]);
    const [loading, setLoading] = useState(false);
    const isRetiredUpdated: boolean = isFieldUpdated({ retired }, originalFields, 'retired');
    const getEntries = useLicenseStore(state => state.getEntries);
    const classes = useObjectDetailsStyles(props);

    useEffect(() => {
        const licenses = getEntries();
        if (licenses && licenses.length) {
            licenses.sort((a: License, b: License) => a.Name.localeCompare(b.Name));
        }
        setLicenseList(licenses);
    }, [getEntries]);

    let licenseSource: RepositoryPath | null = null;
    if (licenseInheritance && path) {
        for (const objectAncestorList of path) {
            for (const objectAncestor of objectAncestorList) {
                if (objectAncestor.idSystemObject === licenseInheritance) {
                    licenseSource = objectAncestor;
                    break;
                }
            }
            if (licenseSource)
                break;
        }
    }

    const onClearLicenseAssignment = async () => {
        setLoading(true);

        const { data } = await clearLicenseAssignment(idSystemObject);
        if (data?.clearLicenseAssignment?.success) {
            const message: string | null | undefined = data?.clearLicenseAssignment?.message;
            toast.success(`License assignment successfully cleared${message ? ': ' + message : ''}`);
        } else {
            toast.error(`License assignment failure: ${data?.clearLicenseAssignment?.message}`);
        }

        setLoading(false);
    };

    const onAssignInheritedLicense = async () => {
        setLoading(true);

        if (license) {
            const { data } = await assignLicense(idSystemObject, license);
            if (data?.assignLicense?.success) {
                const message: string | null | undefined = data?.assignLicense?.message;
                toast.success(`License assignment successfully assigned${message ? ': ' + message : ''}`);
            } else
                toast.error(`License assignment failure: ${data?.assignLicense?.message}`);
        }

        setLoading(false);
    };

    const onPublish = async () => { onPublishWorker(ePublishedState.ePublished, 'Publish'); };
    const onAPIOnly = async () => { onPublishWorker(ePublishedState.eAPIOnly, 'Publish for API Only'); };
    const onUnpublish = async () => { onPublishWorker(ePublishedState.eNotPublished, 'Unpublish'); };
    const onSyncToEdan = async () => { onPublishWorker(ePublishedState.ePublished, 'Sync to Edan'); };

    const onPublishWorker = async (eState: number, action: string) => {
        setLoading(true);

        // if we're attempting to publish a subject, call the passed in update method first to persist metadata edits
        if (objectType === eSystemObjectType.eSubject && updateData !== undefined) {
            if (!await updateData()) {
                toast.error(`${action} failed while updating object`);
                setLoading(false);
                return;
            }
        }

        const { data } = await publish(idSystemObject, eState);
        if (data?.publish?.success)
            toast.success(`${action} succeeded`);
        else
            toast.error(`${action} failed: ${data?.publish?.message}`);

        setLoading(false);
    };

    return (
        <Box display='flex' flex={2} flexDirection='column'>
            {unit && (<Detail label='Unit' paths={unit} />)}
            {project && (<Detail label='Project' paths={project} />)}
            {subject && (<Detail label='Subject' paths={subject} />)}
            {item && (<Detail label='Media Group' paths={item} />)}
            {(asset && objectType !== eSystemObjectType.eAsset && <Detail idSystemObject={asset?.idSystemObject} label='Asset' value={asset?.name} />)}
            {(objectType === eSystemObjectType.eScene) && (
                <Detail
                    label='Publish State'
                    valueComponent={
                        <Box className={classes.inheritedLicense}>
                            <Typography className={classes.value}>{publishedState}</Typography>
                            &nbsp;<LoadingButton onClick={onPublish} className={classes.loadingBtn} loading={loading} disabled={!publishable}>Publish</LoadingButton>
                            &nbsp;<LoadingButton onClick={onAPIOnly} className={classes.loadingBtn} loading={loading} disabled={!publishable}>API Only</LoadingButton>
                            &nbsp;{(publishedEnum !== ePublishedState.eNotPublished) && (<LoadingButton onClick={onUnpublish} className={classes.loadingBtn} loading={loading}>Unpublish</LoadingButton>)}
                            &nbsp;<Tooltip arrow title={ <ToolTip text={scenePublishNotes} />}><HelpOutline fontSize='small' style={{ alignSelf: 'center', cursor: 'pointer' }} /></Tooltip>
                        </Box>
                    }
                />
            )}
            {(objectType === eSystemObjectType.eSubject) && (
                <Detail
                    label='Edan Sync State'
                    valueComponent={
                        <Box className={classes.inheritedLicense}>
                            <Typography className={classes.value}>{publishedState}</Typography>
                            &nbsp;<LoadingButton onClick={onSyncToEdan} className={classes.loadingBtn} loading={loading} disabled={!publishable}>Sync to Edan</LoadingButton>
                        </Box>
                    }
                />
            )}
            {!hideRetired && (
                <Detail
                    label='Retired'
                    name='retired'
                    valueComponent={
                        <CheckboxNoPadding
                            id='retired'
                            name='retired'
                            disabled={disabled}
                            checked={withDefaultValueBoolean(retired, false)}
                            onChange={onRetiredUpdate}
                            {...getUpdatedCheckboxProps(isRetiredUpdated)}
                            color='primary'
                        />
                    }
                />
            )}
            {licenseSource ? (
                <Detail
                    label='License'
                    valueComponent={
                        <Box className={classes.inheritedLicense}>
                            <Box fontStyle='italic'>
                                <Typography className={classes.value}>{licenseList.find(lic => lic.idLicense === license)?.Name}</Typography>
                            </Box>
                            <Typography className={classes.value}>{' inherited from '}</Typography>
                            <NewTabLink className={classes.link} to={`/repository/details/${licenseSource.idSystemObject}`} target='_blank'>
                                <Typography>{`${getTermForSystemObjectType(licenseSource.objectType)} ${licenseSource.name}`}</Typography>
                            </NewTabLink>
                            <LoadingButton onClick={onAssignInheritedLicense} className={classes.loadingBtn} loading={loading}>
                                Assign License
                            </LoadingButton>
                        </Box>
                    }
                />
            ) : (
                <Detail
                    label='License'
                    valueComponent={
                        <Box className={classes.assignedLicense}>
                            <Select name='License' className={classes.select} onChange={onLicenseUpdate} value={license}>
                                <MenuItem value={0}>None</MenuItem>
                                {licenseList.map(license => (
                                    <MenuItem value={license.idLicense} key={license.idLicense}>
                                        {license.Name}
                                    </MenuItem>
                                ))}
                            </Select>
                            <LoadingButton onClick={onClearLicenseAssignment} loading={loading} className={classes.loadingBtn}>
                                Clear Assignment
                            </LoadingButton>
                        </Box>
                    }
                />
            )}
        </Box>
    );
}

interface DetailProps {
    idSystemObject?: number;
    label: string;
    value?: string;
    valueComponent?: React.ReactNode;
    clickable?: boolean;
    name?: string;
    paths?: RepositoryPath[]
}

function Detail(props: DetailProps): React.ReactElement {
    const { idSystemObject, label, value, valueComponent, clickable = true, name, paths } = props;
    const classes = useStyles(props);

    let content: React.ReactNode = null;
    if (value) {
        content = <Typography className={classes.value}>{value || '-'}</Typography>;
        if (clickable && idSystemObject)
            content = <NewTabLink to={getDetailsUrlForObject(idSystemObject)}>{content}</NewTabLink>;
    } else if (paths) {
        content = <React.Fragment>{paths.map((path, index) => {
            const ciInnner: React.ReactNode = <Typography className={classes.value} key={index}>{path.name || '-'}</Typography>;
            const ciOuter: React.ReactNode = (clickable && path.idSystemObject)
                ? <NewTabLink to={getDetailsUrlForObject(path.idSystemObject)} key={index}>{ciInnner}</NewTabLink>
                : ciInnner;
            return [(index) ? (<Typography className={classes.value} key={`comma${path.idSystemObject}`}>,&nbsp;</Typography>) : null, ciOuter];
        })}</React.Fragment>;
    }

    return (
        <Box className={classes.detail}>
            <Box display='flex' flex={1.5}>
                <Typography className={classes.label}>{label}</Typography>
            </Box>
            <Box display='flex' flex={3.5}>
                <label htmlFor={name} style={{ display: 'none' }}>{name}</label>
                {valueComponent || content}
            </Box>
        </Box>
    );
}

export default ObjectDetails;

const scenePublishNotes =
`In order to publish a scene to EDAN, the following criteria must be met:
-The scene must have thumbnails.
-The scene must be Posed and QC'd (and marked as such on the Details tab).
-The scene must be Approved for Publishing (and marked as such on the Details tab).
-The license controlling the scene must allow for publishing (i.e. not "None" and not "Restricted").
Clicking "Publish" transmits the scene package to EDAN and marks the EDAN record as searchable. Scene downloads will be sent, too, if the license allows it.
Clicking "API Only" transmits the scene package to EDAN, but marks the EDAN record as not searchable.  As well, scene downloads are sent if allowed by the license.
For published scenes, clicking "Unpublish" marks the scene package as inactive and not searchable.
Changes made to scenes are only published to EDAN when the user makes use of "Publish", "API Only", or "Unpublish".
Users must explicitly publish these changes to EDAN.`;