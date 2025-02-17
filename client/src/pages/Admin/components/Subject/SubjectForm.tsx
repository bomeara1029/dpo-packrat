/* eslint-disable react/jsx-max-props-per-line, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps*/

import { Box, Button, Select, MenuItem, Typography, Table, TableBody, TableCell, TableContainer, TableRow } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import React, { useEffect, useState } from 'react';
import { useSubjectStore, StateIdentifier, useVocabularyStore, eObjectMetadataType, useObjectMetadataStore } from '../../../../store';
import SearchList from '../../../Ingestion/components/SubjectItem/SearchList';
import { RotationOriginInput, RotationQuaternionInput } from '../../../Repository/components/DetailsView/DetailsTab/SubjectDetails';
import { getUnitsList, getUnitFromEdanAbbreviation, createLocation, createSubjectWithIdentifiers } from '../../hooks/useAdminView';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { eVocabularySetID } from '@dpo-packrat/common';
import AssetIdentifiers from '../../../../components/shared/AssetIdentifiers';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router';
import { CreateSubjectWithIdentifiersInput } from '../../../../types/graphql';
import { Helmet } from 'react-helmet';
import MetadataControlTable from '../../../Repository/components/DetailsView/DetailsTab/MetadataControlTable';
import { DebounceInput } from 'react-debounce-input';
import { useStyles as useTableStyles, updatedFieldStyling } from '../../../Repository/components/DetailsView/DetailsTab/CaptureDataDetails';
import clsx from 'clsx';
import GenericBreadcrumbsView from '../../../../components/shared/GenericBreadcrumbsView';

const useStyles = makeStyles(({ palette }) => ({
    container: {
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        overflow: 'auto',
        maxHeight: 'calc(100vh - 60px)'
    },
    content: {
        display: 'flex',
        flex: 1,
        minWidth: '52vw',
        width: 'fit-content',
        flexDirection: 'column',
        padding: '0px 20px 0px 20px'
    },
    filesLabel: {
        color: palette.primary.dark,
        marginRight: 20
    },
    fileChip: {
        marginRight: 10,
        marginBottom: 5
    },
    btn: {
        backgroundColor: '#3854d0',
        color: 'white',
        width: '90px',
        height: '30px',
        outline: '2px hidden #8DABC4',
        '& :focus': {
            outline: '2px solid #8DABC4',
        }
    },
    breadCrumbsContainer: {
        display: 'flex',
        alignItems: 'center',
        minHeight: '46px',
        paddingLeft: '20px',
        paddingRight: '20px',
        background: '#ECF5FD',
        color: '#3F536E',
        width: 'fit-content',
        marginLeft: '15px'
    }
}));

/*
    Creating Identifiers:
        Pop the identifiers into the createIdentifiers mutation and get them back
        Find the one that's preferred and that'll be the idIdentifierPreferred for subject
*/

export type CoordinateValues = {
    Latitude: number | null;
    Longitude: number | null;
    Altitude: number | null;
    TS0: number | null;
    TS1: number | null;
    TS2: number | null;
    R0: number | null;
    R1: number | null;
    R2: number | null;
    R3: number | null;
};

function SubjectForm(): React.ReactElement {
    const classes = useStyles();
    const tableClasses = useTableStyles();
    const navigate = useNavigate();
    const location = useLocation();
    const [subjectName, setSubjectName] = useState('');
    const [subjectUnit, setSubjectUnit] = useState(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [unitList, setUnitList] = useState<any>([]);
    const [subjectIdentifiers, setSubjectIdentifiers] = useState<StateIdentifier[]>([]);
    const [coordinateValues, setCoordinateValues] = useState<CoordinateValues>({
        Latitude: null,
        Longitude: null,
        Altitude: null,
        TS0: null,
        TS1: null,
        TS2: null,
        R0: null,
        R1: null,
        R2: null,
        R3: null
    });
    const [systemCreated, setSystemCreated] = useState(false);
    const [validName, setValidName] = useState(true);
    const [validUnit, setValidUnit] = useState(true);
    const [subjects, reset] = useSubjectStore(state => [state.subjects, state.reset]);
    const [getEntries] = useVocabularyStore(state => [state.getEntries]);
    const [getAllMetadataEntries, resetMetadata, validateMetadataFields, initializeMetadata] = useObjectMetadataStore(state => [state.getAllMetadataEntries, state.resetMetadata, state.validateMetadataFields, state.initializeMetadata]);
    const schema = yup.object().shape({
        subjectName: yup.string().min(1),
        subjectUnit: yup.number().positive(),
        subjectIdentifiers: yup
            .array()
            .min(1)
            .of(
                yup.object().shape({
                    id: yup.number(),
                    identifier: yup.string().min(1),
                    identifierType: yup.number().nullable(),
                    selected: yup.boolean(),
                    idIdentifier: yup.number()
                })
            )
    });

    // Fetches initial unit list for drop down
    useEffect(() => {
        const fetchUnitList = async () => {
            const { data } = await getUnitsList();
            if (data?.getUnitsFromNameSearch.Units && data?.getUnitsFromNameSearch.Units.length) {
                const fetchedUnitList = data?.getUnitsFromNameSearch.Units.slice();
                if (fetchedUnitList && fetchedUnitList.length) fetchedUnitList.sort((a, b) => a.Name.localeCompare(b.Name));
                setUnitList(fetchedUnitList);
            }
        };
        fetchUnitList();
    }, []);

    // Responsible for autofilling when a subject is selected
    useEffect(() => {
        const extractSubjectData = async () => {
            if (subjects.length > 0) {
                const { name, unit, arkId, collectionId } = subjects[subjects.length - 1];
                setSubjectName(name);
                const { data } = await getUnitFromEdanAbbreviation(unit);
                setSubjectUnit(data?.getUnitsFromEdanAbbreviation?.Units[0]?.idUnit);
                const newIdentifiers: StateIdentifier[] = [];

                if (arkId) {
                    newIdentifiers.push({
                        id: newIdentifiers.length,
                        identifier: arkId,
                        identifierType: getEntries(eVocabularySetID.eIdentifierIdentifierType)[0].idVocabulary,
                        idIdentifier: 0
                    });
                }

                if (collectionId) {
                    newIdentifiers.push({
                        id: newIdentifiers.length,
                        identifier: collectionId,
                        identifierType: getEntries(eVocabularySetID.eIdentifierIdentifierType)[2].idVocabulary,
                        idIdentifier: 0
                    });
                }

                setSubjectIdentifiers(newIdentifiers);
            }
        };

        extractSubjectData();
    }, [subjects, getEntries]);

    useEffect(() => {
        initializeMetadata(eObjectMetadataType.eSubjectCreation);
    }, []);

    useEffect(() => {
        return () => {
            reset();
            resetMetadata();
        };
    }, []);

    const onIdentifierChange = (identifiers: StateIdentifier[]) => {
        setSubjectIdentifiers(identifiers);
    };

    const onIdentifierPreferredChange = (id: number) => {
        const subjectIdentifiersCopy = subjectIdentifiers.map(identifier => {
            if (id === identifier.id) {
                if (identifier.preferred) {
                    identifier.preferred = undefined;
                } else {
                    identifier.preferred = true;
                }
                return identifier;
            }
            identifier.preferred = undefined;
            return identifier;
        });
        setSubjectIdentifiers(subjectIdentifiersCopy);
    };

    const validateFields = async (): Promise<boolean | void> => {
        toast.dismiss();
        try {
            const isValidName = await schema.isValid({ subjectName });
            setValidName(isValidName);
            if (!isValidName) toast.error('Creation Failed: Name Cannot Be Empty', { autoClose: false });

            const isValidUnit = await schema.isValid({ subjectUnit });
            setValidUnit(isValidUnit);
            if (!isValidUnit) toast.error('Creation Failed: Must Select A Unit', { autoClose: false });

            const isValidIdentifiers = (await schema.isValid({ subjectIdentifiers })) || systemCreated;
            if (!isValidIdentifiers) toast.error('Creation Failed: Must Either Include Identifier Or Have System Create One', { autoClose: false });

            const invalidMetadata = validateMetadataFields(eObjectMetadataType.eSubjectCreation);
            if (invalidMetadata.length) {
                invalidMetadata.forEach(message => toast.error(message, { autoClose: false }));
            }

            return isValidName && isValidUnit && isValidIdentifiers && invalidMetadata.length === 0;
        } catch (error) {
            const message: string = (error instanceof Error) ? error.message : 'Validation Failure';
            toast.error(message);
        }
    };

    const validateCoordinateValues = (): boolean => {
        let result = false;

        for (const coordinate in coordinateValues) {
            if (coordinateValues[coordinate] !== null) result = true;
        }

        return result;
    };

    const handleCoordinateChange = ({ target }) => {
        const name = target.name;
        const value = Number(target.value);
        setCoordinateValues({ ...coordinateValues, [name]: value });
    };

    const handleUnitSelectChange = ({ target }) => {
        setSubjectUnit(target.value);
    };

    const handleSystemCreatedChange = () => setSystemCreated(!systemCreated);

    const onCreateSubject = async () => {
        const validFields = await validateFields();
        if (!validFields) return;

        try {
            const hasValidCoordinate = validateCoordinateValues();
            let idGeoLocation: number | null = null;

            if (hasValidCoordinate) {
                const { data } = await createLocation(coordinateValues);
                idGeoLocation = data?.createGeoLocation?.GeoLocation?.idGeoLocation;
                if (!idGeoLocation) {
                    toast.error('Error: Failure To Create GeoLocation');
                    return;
                }
            }

            const identifierList = subjectIdentifiers.map(({ identifier, identifierType, preferred }) => {
                return { identifierValue: identifier, identifierType: identifierType || getEntries(eVocabularySetID.eIdentifierIdentifierType)[0].idVocabulary, preferred };
            });
            const metadata = getAllMetadataEntries();
            const createSubjectWithIdentifiersInput: CreateSubjectWithIdentifiersInput = {
                identifiers: identifierList,
                subject: { idUnit: subjectUnit, Name: subjectName, idGeoLocation },
                systemCreated,
                metadata
            };
            // console.log('createSubjectsWithIdentifiersInput', createSubjectWithIdentifiersInput);

            const {
                data: {
                    createSubjectWithIdentifiers: { success, message }
                }
            } = await createSubjectWithIdentifiers(createSubjectWithIdentifiersInput);
            if (success) {
                toast.success('Subject Successfully Created!');
                reset();
                resetMetadata();
                navigate('/admin/subjects');
            } else {
                toast.error(`Failed To Create Subject: ${message}`);
            }
        } catch (error) {
            const message: string = (error instanceof Error) ? `: ${error.message}` : '';
            toast.error(`Failed To Create Subject${message}`);
        }
    };

    return (
        <Box className={classes.container}>
            <Helmet>
                <title>Create Subject</title>
            </Helmet>
            <Box className={classes.breadCrumbsContainer}>
                <GenericBreadcrumbsView items={location.pathname.slice(1)} />
            </Box>
            <Box className={classes.content}>
                <SearchList EdanOnly />
                <Box style={{ marginTop: '10px', marginBottom: '10px', width: '600px', backgroundColor: 'rgb(236, 245, 253)', paddingTop: '5px', paddingBottom: '5px', borderRadius: '5px' }}>
                    <TableContainer>
                        <Table>
                            <TableBody>
                                <TableRow>
                                    <TableCell className={tableClasses.tableCell}>
                                        <Typography className={clsx(tableClasses.labelText)}>Name</Typography>
                                    </TableCell>
                                    <TableCell className={clsx(tableClasses.tableCell, tableClasses.valueText)}>
                                        <DebounceInput
                                            element='input'
                                            title='Name-input'
                                            value={subjectName}
                                            type='string'
                                            name='Name'
                                            className={tableClasses.input}
                                            onChange={({ target }) => setSubjectName(target.value)}
                                            style={{ ...updatedFieldStyling(!validName) }}
                                        />
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className={tableClasses.tableCell}>
                                        <Typography className={clsx(tableClasses.labelText)}>Unit</Typography>
                                    </TableCell>
                                    <TableCell className={clsx(tableClasses.tableCell, tableClasses.valueText)}>
                                        <Select value={subjectUnit} onChange={handleUnitSelectChange} error={!validUnit} style={{ height: '18px', fontSize: '0.8rem' }} SelectDisplayProps={{ style: { paddingTop: 0, paddingBottom: 0, paddingLeft: '10px' } }}>
                                            <MenuItem value={0} key={0}>
                                                None
                                            </MenuItem>
                                            {unitList.map(unit => (
                                                <MenuItem value={unit.idUnit} key={unit.idUnit}>
                                                    {unit.Name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className={tableClasses.tableCell}>
                                        <Typography className={tableClasses.labelText}>Latitude</Typography>
                                    </TableCell>
                                    <TableCell className={clsx(tableClasses.tableCell, tableClasses.valueText)}>
                                        <DebounceInput
                                            element='input'
                                            title='Latitude-input'
                                            value={coordinateValues.Latitude || ''}
                                            type='number'
                                            name='Latitude'
                                            onChange={handleCoordinateChange}
                                            className={tableClasses.input}
                                        />
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className={tableClasses.tableCell}>
                                        <Typography className={tableClasses.labelText}>Longitude</Typography>
                                    </TableCell>
                                    <TableCell className={clsx(tableClasses.tableCell, tableClasses.valueText)}>
                                        <DebounceInput
                                            element='input'
                                            title='Longitude-input'
                                            value={coordinateValues.Longitude || ''}
                                            type='number'
                                            name='Longitude'
                                            onChange={handleCoordinateChange}
                                            className={tableClasses.input}
                                        />
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className={tableClasses.tableCell}>
                                        <Typography className={tableClasses.labelText}>Altitude</Typography>
                                    </TableCell>
                                    <TableCell className={clsx(tableClasses.tableCell, tableClasses.valueText)}>
                                        <DebounceInput
                                            element='input'
                                            title='Altitude-input'
                                            value={coordinateValues.Altitude || ''}
                                            type='number'
                                            name='Altitude'
                                            onChange={handleCoordinateChange}
                                            className={tableClasses.input}
                                        />
                                    </TableCell>
                                </TableRow>
                                <RotationOriginInput TS0={coordinateValues.TS0} TS1={coordinateValues.TS1} TS2={coordinateValues.TS2} onChange={handleCoordinateChange} ignoreUpdate />
                                <RotationQuaternionInput
                                    R0={coordinateValues.R0}
                                    R1={coordinateValues.R1}
                                    R2={coordinateValues.R2}
                                    R3={coordinateValues.R3}
                                    onChange={handleCoordinateChange}
                                    ignoreUpdate
                                />
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
                <AssetIdentifiers
                    systemCreated={systemCreated}
                    identifiers={subjectIdentifiers}
                    onSystemCreatedChange={handleSystemCreatedChange}
                    onAddIdentifer={onIdentifierChange}
                    onUpdateIdentifer={onIdentifierChange}
                    onRemoveIdentifer={onIdentifierChange}
                    onUpdateIdIdentifierPreferred={onIdentifierPreferredChange}
                    subjectView
                    identifierName='Subject'
                />
                <Box mb={3}>
                    <MetadataControlTable type={eObjectMetadataType.eSubjectCreation} metadataData={[]} />
                </Box>
                <Button className={classes.btn} onClick={onCreateSubject} variant='contained' disableElevation>
                    Create
                </Button>
            </Box>
        </Box>
    );
}

export default SubjectForm;
